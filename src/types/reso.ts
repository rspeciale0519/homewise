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
  SchoolDistrict?: string;
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
}

export interface ResoMedia {
  MediaURL: string;
  MediaCategory?: string;
  Order?: number;
  ShortDescription?: string;
}

export interface ResoOpenHouse {
  OpenHouseDate: string;
  OpenHouseStartTime: string;
  OpenHouseEndTime: string;
  OpenHouseRemarks?: string;
}

export interface ResoODataResponse {
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: ResoProperty[];
}
