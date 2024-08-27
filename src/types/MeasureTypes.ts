export interface UploadMeasureData {
    image: string;
    customer_code: string;
    measure_datetime: string;
    measure_type: 'WATER' | 'GAS';
  }
  
  export interface ConfirmMeasureData {
    measure_uuid: string;
    confirmed_value: number;
  }
  
  export interface MeasureResponse {
    image_url: string;
    measure_value: number;
    measure_uuid: string;
  }
  
  export interface ListMeasureResponse {
    measure_uuid: string;
    measure_datetime: Date;
    measure_type: string;
    has_confirmed: boolean;
    image_url: string;
  }
  