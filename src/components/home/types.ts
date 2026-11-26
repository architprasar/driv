export type HomeCar = {
  id: number;
  brand_name: string;
  model_name: string;
  variant?: string;
  year: number;
  price: string | number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  primary_image?: { image: string };
  is_assured?: boolean;
};
export type HomeAuction = {
  id: number;
  car_title?: string;
  car_image?: string;
  lot_number?: string;
  starting_bid?: string;
  title?: string;
  status: string;
  current_bid?: number | string;
  starting_price?: number | string;
  end_time?: string;
  start_time?: string;
  vehicle?: {
    brand_name?: string;
    model_name?: string;
    year?: number;
    primary_image?: { image: string };
  };
};
