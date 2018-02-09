import {
  Component, ElementRef, EventEmitter, Inject, Input, Output, PLATFORM_ID, Renderer2,
  ViewChild, DoCheck, KeyValueDiffers
} from '@angular/core';
import {SwipeService} from './swipe.service';
import {isNullOrUndefined, isUndefined} from 'util';
import {isPlatformServer} from '@angular/common';
import {ISlide} from './ISlide';

@Component({
  selector: 'slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.scss']
})
export class SlideshowComponent implements DoCheck {
  // @todo: detect loading and show spinner until the images are loaded/just the first one
  public slideIndex: number = 0;
  public slides: ISlide[] = [];
  private autoplayIntervalId: any;
  private initial: boolean = true;
  private imgUrlsDifference: any;

  @Input() imageUrls: string[];
  @Input() height: string;
  @Input() minHeight: string;
  @Input() arrowSize: string;
  @Input() showArrows: boolean = true;
  @Input() disableSwiping: boolean = false;
  @Input() autoPlay: boolean = false;
  @Input() autoPlayInterval: number = 3333;
  @Input() stopAutoPlayOnSlide: boolean = true;
  @Input() debug: boolean = false;
  @Input() backgroundSize: string = 'cover';
  @Input() backgroundPosition: string = 'center center';
  @Input() backgroundRepeat: string = 'no-repeat';
  @Input() showDots: boolean = false;

  @Output('onSlideLeft') public onSlideLeft = new EventEmitter<number>();
  @Output('onSlideRight') public onSlideRight = new EventEmitter<number>();
  @Output('onSwipeLeft') public onSwipeLeft = new EventEmitter<number>();
  @Output('onSwipeRight') public onSwipeRight = new EventEmitter<number>();

  @ViewChild('container') container: ElementRef;
  @ViewChild('prevArrow') prevArrow: ElementRef;
  @ViewChild('nextArrow') nextArrow: ElementRef;

  constructor(
    private swipeService: SwipeService,
    private renderer: Renderer2,
    private differs: KeyValueDiffers,
    @Inject(PLATFORM_ID) private platform_id: any
  ) {
    this.imgUrlsDifference = this.differs.find({}).create();
  }

  ngDoCheck() {
    var changes = this.imgUrlsDifference.diff(this.imageUrls);
    if(changes) { // imageUrls have been changed, need to reset the slides
      if(this.debug === true)  {
        console.log('changes detected in DoCheck')
        changes.forEachChangedItem(item => console.log('changed item: ', item.currentValue));
      };
      this.setSlides();
      this.setStyles();
      this.handleAutoPlay();
    } else {
      if(this.debug) console.log('nothing changed');
    }
  }

  /**
   * @param {number} indexDirection
   * @param {boolean} isSwipe
   * @description this is the function that should be called to make the slides change.
   *              indexDirection to move back is -1, to move forward is 1, and to stay in place is 0.
   *              0 is taken into account for failed swipes
   */
  onSlide(indexDirection: number, isSwipe?: boolean): void {
    if(this.debug === true) console.log(`onSlide(${indexDirection}, ${isSwipe})`);
    this.handleAutoPlay(this.stopAutoPlayOnSlide);
    this.slide(indexDirection, isSwipe);
  }

  /**
   * @param {TouchEvent} e
   * @param {string} when
   * @description Use the swipe service to detect swipe events from phone and tablets
   */
  onSwipe(e: TouchEvent, when: string): void {
    if(this.disableSwiping === true) return;
    const indexDirection = this.swipeService.swipe(e, when, this.debug === true);
    // handle a failed swipe
    if(indexDirection === 0) return;
    else this.onSlide(indexDirection, true);
  }

  /**
   * @param {number} index
   * @description set the index to the desired index - 1 and simulate a right slide
   */
  onButtonClick(index: number) {
    if(this.debug === true) console.log(`onButtonClick(${index})`);
    const beforeClickIndex = this.slideIndex;
    this.slideIndex = index - 1;
    this.setSlideIndex(1);
    this.handleAutoPlay(this.stopAutoPlayOnSlide);

    this.slideRight(beforeClickIndex);
    this.slides[beforeClickIndex].selected = false;
    this.slides[this.slideIndex].selected = true;
  }

  /**
   * @param {number} indexDirection
   * @param {boolean} isSwipe
   * @description Set the new slide index, then make the transition happen.
   */
  private slide(indexDirection: number, isSwipe?: boolean): void {
    if(this.debug === true) console.log(`slide(${indexDirection}, ${isSwipe})`);
    const oldIndex = this.slideIndex;
    this.setSlideIndex(indexDirection);

    if(indexDirection === 1) this.slideRight(oldIndex, isSwipe);
    else this.slideLeft(oldIndex, isSwipe);
    this.slides[oldIndex].selected = false;
    this.slides[this.slideIndex].selected = true;
  }

  /**
   * @param {number} indexDirection
   * @description This is just treating the url array like a circular list.
   */
  private setSlideIndex(indexDirection: number): void {
    if(this.debug === true) console.log(`setSlideIndex(${this.slideIndex})`);
    this.slideIndex += indexDirection;
    if(this.slideIndex < 0) this.slideIndex = this.slides.length - 1;
    if(this.slideIndex >= this.slides.length) this.slideIndex = 0;
  }

  /**
   * @param {number} oldIndex
   * @param {boolean} isSwipe
   * @description This function handles the variables to move the CSS classes around accordingly.
   *              In order to correctly handle animations, the new slide as well as the slides to
   *              the left and right are assigned classes.
   */
  private slideLeft(oldIndex: number, isSwipe?: boolean): void {
    if(this.debug === true) console.log(`slideLeft(${oldIndex}, ${isSwipe})`);
    if(isSwipe === true) this.onSwipeLeft.emit(this.slideIndex);
    else this.onSlideLeft.emit(this.slideIndex);
    this.slides[this.getLeftSideIndex(oldIndex)].leftSide = false;
    this.slides[oldIndex].leftSide = true;
    this.slides[oldIndex].action = 'slideOutLeft';
    this.slides[this.slideIndex].rightSide = false;
    this.slides[this.getRightSideIndex()].rightSide = true;
    this.slides[this.slideIndex].action = 'slideInRight';
  }

  /**
   * @param {number} oldIndex
   * @param {boolean} isSwipe
   * @description This function handles the variables to move the CSS classes around accordingly.
   *              In order to correctly handle animations, the new slide as well as the slides to
   *              the left and right are assigned classes.
   */
  private slideRight(oldIndex: number, isSwipe?: boolean): void {
    if(this.debug === true) console.log(`slideRight(${oldIndex}, ${isSwipe})`);
    if(isSwipe === true) this.onSwipeRight.emit(this.slideIndex);
    else this.onSlideRight.emit(this.slideIndex);
    this.slides[this.getRightSideIndex(oldIndex)].rightSide = false;
    this.slides[oldIndex].rightSide = true;
    this.slides[oldIndex].action = 'slideOutRight';
    this.slides[this.slideIndex].leftSide = false;
    this.slides[this.getLeftSideIndex()].leftSide = true;
    this.slides[this.slideIndex].action = 'slideInLeft';
  }

  /**
   * @description Check to make sure slide images have been set or haven't changed
   */
  private setSlides(): void {
    if(this.debug === true) console.log(`setSlides()`);
    this.slides = [];
    for (let url of this.imageUrls)
      this.slides.push({
        url: url,
        action: '',
        leftSide: false,
        rightSide: false,
        selected: false
      });
    /* @todo: improve the slideIndex logic as if the images were changed dynamically,
       we will see a glitch as the image displayed would be changed. For instance if the slideIndex was 0
       and we do imgUrls.unshift(), with autoplay the next item at 1 will become the item shown at 0 earlier.
    */
    this.slides[this.slideIndex].selected = true;
  }

  /**
   * @param {boolean} stopAutoPlay
   * @description Start or stop autoPlay, don't do it at all server side
   */
  private handleAutoPlay(stopAutoPlay?: boolean): void {
    if(isPlatformServer(this.platform_id)) return;
    if (stopAutoPlay === true || this.autoPlay === false) {
      if(this.debug === true) console.log(`stop autoPlay`);
      if(!isNullOrUndefined(this.autoplayIntervalId)) clearInterval(this.autoplayIntervalId);
    }
    else if(isNullOrUndefined(this.autoplayIntervalId)) {
      if(this.debug === true) console.log(`start autoPlay`);
      this.autoplayIntervalId = setInterval(() => {
        if(this.debug === true) console.log(`autoPlay slide event`);
        this.slide(1);
      }, this.autoPlayInterval);
    }
  }

  /**
   * @description Keep the styles up to date with the input
   */
  private setStyles(): void {
    if(this.debug === true) console.log(`setStyles()`);
    if(!isNullOrUndefined(this.height)) this.renderer.setStyle(this.container.nativeElement, 'height', this.height);
    if(!isNullOrUndefined(this.minHeight)) this.renderer.setStyle(this.container.nativeElement, 'min-height', this.minHeight);
    if(!isNullOrUndefined(this.arrowSize)) {
      this.renderer.setStyle(this.prevArrow.nativeElement, 'height', this.arrowSize);
      this.renderer.setStyle(this.prevArrow.nativeElement, 'width', this.arrowSize);
      this.renderer.setStyle(this.nextArrow.nativeElement, 'height', this.arrowSize);
      this.renderer.setStyle(this.nextArrow.nativeElement, 'width', this.arrowSize);
    }
  }

  /**
   * @param {number} i
   * @returns {number}
   * @description get the index for the slide to the left of the new slide
   */
  private getLeftSideIndex(i?: number): number {
    if(isUndefined(i)) i = this.slideIndex;
    if(--i < 0) i = this.slides.length - 1;
    return i;
  }

  /**
   * @param {number} i
   * @returns {number}
   * @description get the index for the slide to the right of the new slide
   */
  private getRightSideIndex(i?: number): number {
    if(isUndefined(i)) i = this.slideIndex;
    if(++i >= this.slides.length) i = 0;
    return i;
  }
}
