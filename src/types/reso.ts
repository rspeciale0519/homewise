export interface ResoProperty {
  ListingKey: string;
  ListingId: string;
  StandardStatus: "Active" | "Pending" | "Closed" | "Withdrawn" | "Expired" | "Coming Soon";
  ListPrice: number;
  ClosePrice?: number;
  OriginalListPrice?: number;
  UnparsedAddress: string;
  StreetNumber?: string;
  StreetName?: string;
  StreetSuffix?: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  CountyOrParish?: string;
  SubdivisionName?: string;
  BedroomsTotal: number;
  BathroomsFull: number;
  BathroomsHalf: number;
  BathroomsTotalDecimal: number;
  LivingArea: number;
  LotSizeArea?: number;
  YearBuilt?: number;
  PropertyType: string;
  PropertySubType?: string;
  PublicRemarks?: string;
  Media?: ResoMedia[];
  Latitude?: number;
  Longitude?: number;
  AssociationFee?: number;
  AssociationFeeFrequency?: string;
  TaxAnnualAmount?: number;
  TaxYear?: number;
  PoolPrivateYN?: boolean;
  WaterfrontYN?: boolean;
  GarageYN?: boolean;
  GarageSpaces?: number;
  NewConstructionYN?: boolean;
  CommunityFeatures?: string[];
  DaysOnMarket?: number;
  ListingContractDate?: string;
  CloseDate?: string;
  OpenHouse?: ResoOpenHouse[];
  ElementarySchoolDistrict?: string;
  MiddleOrJuniorSchoolDistrict?: string;
  HighSchoolDistrict?: string;
  ElementarySchool?: string;
  MiddleOrJuniorSchool?: string;
  HighSchool?: string;
  ListAgentFullName?: string;
  ListAgentMlsId?: string;
  ListAgentDirectPhone?: string;
  ListAgentEmail?: string;
  ListOfficeName?: string;
  ListOfficeMlsId?: string;
  VirtualTourURLUnbranded?: string;
  ModificationTimestamp: string;
  OriginatingSystemName?: string;
  MlgCanView?: boolean;
  MlgCanUse?: string[];
  PhotosChangeTimestamp?: string;
}

export interface ResoMedia {
  MediaKey?: string;
  MediaURL: string;
  MediaCategory?: string;
  MediaModificationTimestamp?: string;
  Order?: number;
  ShortDescription?: string;
}

export interface ResoOpenHouse {
  OpenHouseKey?: string;
  ListingId?: string;
  OpenHouseDate: string;
  OpenHouseStartTime: string;
  OpenHouseEndTime: string;
  OpenHouseRemarks?: string;
  ModificationTimestamp?: string;
  MlgCanView?: boolean;
}

export interface ResoODataResponse<T = ResoProperty> {
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}
