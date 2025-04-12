import {components} from '../openapi.json'
import Ajv, {ValidateFunction} from "ajv"
import ajvErrors from 'ajv-errors';
import ajvFormats from 'ajv-formats';
import { LabResult } from '../types/water-quality-type';
const ajv = new Ajv({
    allErrors: true,
    $data: true,
});

ajv.addVocabulary(['example']);
ajvErrors(ajv);
ajvFormats(ajv);

export const labDataValidator = (labData: LabResult): string[] =>{
    const schema = components.schemas.LabResult;
    const ajvValidate: ValidateFunction<LabResult> = ajv.compile<LabResult>(schema);
    const isValid = ajvValidate(labData);
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
