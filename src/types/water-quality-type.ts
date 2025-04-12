export interface WaterQualityParams {
    timestamp: string;
    locationId: string;
    sourceType: 'sensor' | 'lab' | 'test_kit';
    pH: number;
    chlorine?: number;
    turbidity?: number;
    colour?: 'clear' | 'slightly_colored' | 'colored' | 'highly_colored';
    temperature?: number;
    conductivity?: number;
    dissolvedOxygen?: number;
    totalDissolvedSolids?: number;
  }
  
  export interface SensorReading extends WaterQualityParams {
    deviceId: string;
    firmwareVersion?: string;
    batteryLevel?: number;
  }
  
  export interface LabResult extends WaterQualityParams {
    labId: string;
    certification: string;
    testMethod?: string;
    analyst?: string;
    qualityControl?: {
      passed: boolean;
      notes?: string;
    };
  }
  
  export interface TestKitResult extends WaterQualityParams {
    kitId: string;
    kitType?: string;
    userId: string;
    photoEvidence?: string;
  }
  
  interface WaterQualityData {
    samples: Array<SensorReading | LabResult | TestKitResult>;
  }
  
  interface WaterQualityQueryParams {
    sourceType?: 'sensor' | 'lab' | 'test_kit';
    dateRange?: {
      start: string;
      end: string;
    };
  }
  
  type WaterQualitySample = SensorReading | LabResult | TestKitResult;
  
  interface WaterQualityLimits {
    pH: { min: 0; max: 14 };
    chlorine: { min: 0 };
    turbidity: { min: 0 };
  }
  
  interface ApiResponse<T> {
    data?: T;
    error?: {
      message: string;
      code: number;
    };
    metadata?: {
      totalSamples?: number;
      timeRange?: {
        start: string;
        end: string;
      };
    };
  }