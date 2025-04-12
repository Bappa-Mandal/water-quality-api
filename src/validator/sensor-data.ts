import {components} from '../openapi.json'
import Ajv, {ValidateFunction} from "ajv"
import ajvErrors from 'ajv-errors';
import ajvFormats from 'ajv-formats';
import { SensorReading } from '../types/water-quality-type';
const ajv = new Ajv({
    allErrors: true,
    $data: true,
});

ajv.addVocabulary(['example']);
ajvErrors(ajv);
ajvFormats(ajv);

export const sensorDataValidator = (sensorData: SensorReading): string[] =>{
    const schema = components.schemas.SensorReading;
    const ajvValidate: ValidateFunction<SensorReading> = ajv.compile<SensorReading>(schema);
    const isValid = ajvValidate(sensorData);
    const errors = ajvValidate.errors;
    if (!isValid) {
        const validationErrors :string[]= []
        errors?.forEach((error) => {
            validationErrors.push(`Property ${error.instancePath} ${error.message}`); 
        })
        return validationErrors
    }
    return [];
}
