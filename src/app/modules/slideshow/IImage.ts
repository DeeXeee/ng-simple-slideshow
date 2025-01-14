export interface IImage {
    url: string | null;
    href?: string;
    clickAction?: Function;
    caption?: string;
    captionDescription?: string;
    title?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    button?: boolean;
    buttonColor?: string;
}
