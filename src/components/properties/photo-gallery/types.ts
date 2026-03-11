export interface PhotoGalleryProps {
  photos: string[];
  address: string;
}

export interface LightboxProps {
  photos: string[];
  address: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startIndex: number;
}
