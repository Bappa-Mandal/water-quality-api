import {components} from '../openapi.json'
import Ajv, {ValidateFunction} from "ajv"
import ajvErrors from 'ajv-errors';
import ajvFormats from 'ajv-formats';
import { TestKitResult } from '../types/water-quality-type';
const ajv = new Ajv({
    allErrors: true,
    $data: true,
});

ajv.addVocabulary(['example']);
ajvErrors(ajv);
ajvFormats(ajv);

export const testKitDataValidator = (sensorData: TestKitResult): string[] =>{
    const schema = components.schemas.TestKitResult;
    const ajvValidate: ValidateFunction<TestKitResult> = ajv.compile<TestKitResult>(schema);
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
