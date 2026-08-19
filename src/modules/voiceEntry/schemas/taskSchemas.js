const nullableString = { type: ['string','null'] };
const nullableNumber = { type: ['number','null'] };
const stringArray = { type: 'array', items: { type: 'string' } };
const paymentMode = { type: ['string','null'], enum: ['CASH','BANK_TRANSFER','UPI','CHEQUE',null] };

const schemas = {
  PROCESS_ENTRY: {
    type: 'object', additionalProperties: false,
    properties: {
      processCode: { type: ['string','null'], enum: ['PATHAI','SUKHAI','BHARAI','PHUKAI','PAKAI','NIKASI','CHHANTAI', null] },
      date: nullableString,
      quantityOut: nullableNumber,
      quantityIn: nullableNumber,
      rate: nullableNumber,
      unit: { type: ['string','null'], enum: ['PER_1000','DAILY','PER_PIECE',null] },
      chamberNo: nullableString,
      brickCategoryCode: { type: ['string','null'], enum: ['NO_1','NO_2','NO_3','JHAMA','BROKEN',null] },
      workerNames: stringArray,
      textRemark: nullableString
    },
    required: ['processCode','date','quantityOut','quantityIn','rate','unit','chamberNo','brickCategoryCode','workerNames','textRemark']
  },
  EXPENSE_ENTRY: {
    type:'object', additionalProperties:false,
    properties: { date:nullableString, amount:nullableNumber, paymentMode, categorySpoken:nullableString, paidTo:nullableString, description:nullableString },
    required:['date','amount','paymentMode','categorySpoken','paidTo','description']
  },
  CUSTOMER_PAYMENT: {
    type:'object', additionalProperties:false,
    properties: { paymentDate:nullableString, amount:nullableNumber, paymentMode, customerName:nullableString, referenceNo:nullableString, textRemark:nullableString },
    required:['paymentDate','amount','paymentMode','customerName','referenceNo','textRemark']
  },
  WORKER_ADVANCE: {
    type:'object', additionalProperties:false,
    properties: { date:nullableString, amount:nullableNumber, paymentMode, workerName:nullableString, remark:nullableString },
    required:['date','amount','paymentMode','workerName','remark']
  },
  ATTENDANCE: {
    type:'object', additionalProperties:false,
    properties: {
      date:nullableString,
      entries:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ workerName:{type:'string'}, status:{type:'string',enum:['PRESENT','ABSENT','HALF_DAY','LATE']} }, required:['workerName','status'] } }
    },
    required:['date','entries']
  },
  DISPATCH: {
    type:'object', additionalProperties:false,
    properties: { dispatchDate:nullableString, quantity:nullableNumber, ratePerThousand:nullableNumber, brickCategoryCode:nullableString, vehicleNumber:nullableString, customerName:nullableString, driverName:nullableString, textRemark:nullableString },
    required:['dispatchDate','quantity','ratePerThousand','brickCategoryCode','vehicleNumber','customerName','driverName','textRemark']
  }
};

function getTaskSchema(task) {
  const schema = schemas[task];
  if (!schema) throw new Error(`Unsupported voice task: ${task}`);
  return schema;
}
module.exports = { schemas, getTaskSchema };
