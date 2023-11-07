// @ts-nocheck

import { fullFormats } from "ajv-formats/dist/formats.js";
"use strict";
export const validate = validate14;
export default validate14;
const schema16 = {"$id":"https://github.com/data-fair/lib/session-state","x-exports":["types","validate","schema"],"type":"object","title":"session state","properties":{"user":{"$ref":"#/definitions/user"},"organization":{"$ref":"#/definitions/organizationMembership"},"account":{"$ref":"#/definitions/account"},"accountRole":{"type":"string"},"lang":{"type":"string"},"dark":{"type":"boolean"}},"definitions":{"organizationMembership":{"type":"object","additionalProperties":false,"required":["id","name","role"],"properties":{"id":{"type":"string"},"name":{"type":"string"},"role":{"type":"string"},"department":{"type":"string"},"departmentName":{"type":"string"},"dflt":{"type":"boolean"}}},"userRef":{"type":"object","additionalProperties":false,"required":["id","name"],"properties":{"id":{"type":"string"},"name":{"type":"string"}}},"user":{"type":"object","additionalProperties":false,"required":["email","id","name","organizations"],"properties":{"email":{"type":"string","format":"email"},"id":{"type":"string"},"name":{"type":"string"},"organizations":{"type":"array","items":{"$ref":"#/definitions/organizationMembership"}},"isAdmin":{"type":"integer","enum":[0,1]},"adminMode":{"type":"integer","enum":[0,1]},"asAdmin":{"$ref":"#/definitions/userRef"},"pd":{"type":"string","format":"date"},"ipa":{"type":"integer","enum":[0,1]}}},"account":{"type":"object","additionalProperties":false,"required":["type","id","name"],"properties":{"type":{"type":"string","enum":["user","organization"]},"id":{"type":"string"},"name":{"type":"string"},"department":{"type":"string"},"departmentName":{"type":"string"}}}}};
const schema18 = {"type":"object","additionalProperties":false,"required":["id","name","role"],"properties":{"id":{"type":"string"},"name":{"type":"string"},"role":{"type":"string"},"department":{"type":"string"},"departmentName":{"type":"string"},"dflt":{"type":"boolean"}}};
const schema21 = {"type":"object","additionalProperties":false,"required":["type","id","name"],"properties":{"type":{"type":"string","enum":["user","organization"]},"id":{"type":"string"},"name":{"type":"string"},"department":{"type":"string"},"departmentName":{"type":"string"}}};
const schema17 = {"type":"object","additionalProperties":false,"required":["email","id","name","organizations"],"properties":{"email":{"type":"string","format":"email"},"id":{"type":"string"},"name":{"type":"string"},"organizations":{"type":"array","items":{"$ref":"#/definitions/organizationMembership"}},"isAdmin":{"type":"integer","enum":[0,1]},"adminMode":{"type":"integer","enum":[0,1]},"asAdmin":{"$ref":"#/definitions/userRef"},"pd":{"type":"string","format":"date"},"ipa":{"type":"integer","enum":[0,1]}}};
const schema19 = {"type":"object","additionalProperties":false,"required":["id","name"],"properties":{"id":{"type":"string"},"name":{"type":"string"}}};
const func2 = Object.prototype.hasOwnProperty;
const formats0 = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const formats2 = fullFormats.date;

function validate15(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.email === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "email"},message:"must have required property '"+"email"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.name === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.organizations === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "organizations"},message:"must have required property '"+"organizations"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!(func2.call(schema17.properties, key0))){
const err4 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.email !== undefined){
let data0 = data.email;
if(typeof data0 === "string"){
if(!(formats0.test(data0))){
const err5 = {instancePath:instancePath+"/email",schemaPath:"#/properties/email/format",keyword:"format",params:{format: "email"},message:"must match format \""+"email"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/email",schemaPath:"#/properties/email/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.id !== undefined){
if(typeof data.id !== "string"){
const err7 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.name !== undefined){
if(typeof data.name !== "string"){
const err8 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.organizations !== undefined){
let data3 = data.organizations;
if(Array.isArray(data3)){
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.id === undefined){
const err9 = {instancePath:instancePath+"/organizations/" + i0,schemaPath:"#/definitions/organizationMembership/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data4.name === undefined){
const err10 = {instancePath:instancePath+"/organizations/" + i0,schemaPath:"#/definitions/organizationMembership/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data4.role === undefined){
const err11 = {instancePath:instancePath+"/organizations/" + i0,schemaPath:"#/definitions/organizationMembership/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
for(const key1 in data4){
if(!((((((key1 === "id") || (key1 === "name")) || (key1 === "role")) || (key1 === "department")) || (key1 === "departmentName")) || (key1 === "dflt"))){
const err12 = {instancePath:instancePath+"/organizations/" + i0,schemaPath:"#/definitions/organizationMembership/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data4.id !== undefined){
if(typeof data4.id !== "string"){
const err13 = {instancePath:instancePath+"/organizations/" + i0+"/id",schemaPath:"#/definitions/organizationMembership/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data4.name !== undefined){
if(typeof data4.name !== "string"){
const err14 = {instancePath:instancePath+"/organizations/" + i0+"/name",schemaPath:"#/definitions/organizationMembership/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data4.role !== undefined){
if(typeof data4.role !== "string"){
const err15 = {instancePath:instancePath+"/organizations/" + i0+"/role",schemaPath:"#/definitions/organizationMembership/properties/role/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data4.department !== undefined){
if(typeof data4.department !== "string"){
const err16 = {instancePath:instancePath+"/organizations/" + i0+"/department",schemaPath:"#/definitions/organizationMembership/properties/department/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data4.departmentName !== undefined){
if(typeof data4.departmentName !== "string"){
const err17 = {instancePath:instancePath+"/organizations/" + i0+"/departmentName",schemaPath:"#/definitions/organizationMembership/properties/departmentName/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data4.dflt !== undefined){
if(typeof data4.dflt !== "boolean"){
const err18 = {instancePath:instancePath+"/organizations/" + i0+"/dflt",schemaPath:"#/definitions/organizationMembership/properties/dflt/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
else {
const err19 = {instancePath:instancePath+"/organizations/" + i0,schemaPath:"#/definitions/organizationMembership/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
else {
const err20 = {instancePath:instancePath+"/organizations",schemaPath:"#/properties/organizations/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.isAdmin !== undefined){
let data11 = data.isAdmin;
if(!((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11)))){
const err21 = {instancePath:instancePath+"/isAdmin",schemaPath:"#/properties/isAdmin/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(!((data11 === 0) || (data11 === 1))){
const err22 = {instancePath:instancePath+"/isAdmin",schemaPath:"#/properties/isAdmin/enum",keyword:"enum",params:{allowedValues: schema17.properties.isAdmin.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.adminMode !== undefined){
let data12 = data.adminMode;
if(!((typeof data12 == "number") && (!(data12 % 1) && !isNaN(data12)))){
const err23 = {instancePath:instancePath+"/adminMode",schemaPath:"#/properties/adminMode/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(!((data12 === 0) || (data12 === 1))){
const err24 = {instancePath:instancePath+"/adminMode",schemaPath:"#/properties/adminMode/enum",keyword:"enum",params:{allowedValues: schema17.properties.adminMode.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data.asAdmin !== undefined){
let data13 = data.asAdmin;
if(data13 && typeof data13 == "object" && !Array.isArray(data13)){
if(data13.id === undefined){
const err25 = {instancePath:instancePath+"/asAdmin",schemaPath:"#/definitions/userRef/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data13.name === undefined){
const err26 = {instancePath:instancePath+"/asAdmin",schemaPath:"#/definitions/userRef/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
for(const key2 in data13){
if(!((key2 === "id") || (key2 === "name"))){
const err27 = {instancePath:instancePath+"/asAdmin",schemaPath:"#/definitions/userRef/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data13.id !== undefined){
if(typeof data13.id !== "string"){
const err28 = {instancePath:instancePath+"/asAdmin/id",schemaPath:"#/definitions/userRef/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data13.name !== undefined){
if(typeof data13.name !== "string"){
const err29 = {instancePath:instancePath+"/asAdmin/name",schemaPath:"#/definitions/userRef/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
}
else {
const err30 = {instancePath:instancePath+"/asAdmin",schemaPath:"#/definitions/userRef/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.pd !== undefined){
let data16 = data.pd;
if(typeof data16 === "string"){
if(!(formats2.validate(data16))){
const err31 = {instancePath:instancePath+"/pd",schemaPath:"#/properties/pd/format",keyword:"format",params:{format: "date"},message:"must match format \""+"date"+"\""};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
else {
const err32 = {instancePath:instancePath+"/pd",schemaPath:"#/properties/pd/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.ipa !== undefined){
let data17 = data.ipa;
if(!((typeof data17 == "number") && (!(data17 % 1) && !isNaN(data17)))){
const err33 = {instancePath:instancePath+"/ipa",schemaPath:"#/properties/ipa/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(!((data17 === 0) || (data17 === 1))){
const err34 = {instancePath:instancePath+"/ipa",schemaPath:"#/properties/ipa/enum",keyword:"enum",params:{allowedValues: schema17.properties.ipa.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
}
else {
const err35 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
validate15.errors = vErrors;
return errors === 0;
}


function validate14(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
/*# sourceURL="https://github.com/data-fair/lib/session-state" */;
let vErrors = null;
let errors = 0;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.user !== undefined){
if(!(validate15(data.user, {instancePath:instancePath+"/user",parentData:data,parentDataProperty:"user",rootData}))){
vErrors = vErrors === null ? validate15.errors : vErrors.concat(validate15.errors);
errors = vErrors.length;
}
}
if(data.organization !== undefined){
let data1 = data.organization;
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
if(data1.id === undefined){
const err0 = {instancePath:instancePath+"/organization",schemaPath:"#/definitions/organizationMembership/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data1.name === undefined){
const err1 = {instancePath:instancePath+"/organization",schemaPath:"#/definitions/organizationMembership/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data1.role === undefined){
const err2 = {instancePath:instancePath+"/organization",schemaPath:"#/definitions/organizationMembership/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data1){
if(!((((((key0 === "id") || (key0 === "name")) || (key0 === "role")) || (key0 === "department")) || (key0 === "departmentName")) || (key0 === "dflt"))){
const err3 = {instancePath:instancePath+"/organization",schemaPath:"#/definitions/organizationMembership/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data1.id !== undefined){
if(typeof data1.id !== "string"){
const err4 = {instancePath:instancePath+"/organization/id",schemaPath:"#/definitions/organizationMembership/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data1.name !== undefined){
if(typeof data1.name !== "string"){
const err5 = {instancePath:instancePath+"/organization/name",schemaPath:"#/definitions/organizationMembership/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data1.role !== undefined){
if(typeof data1.role !== "string"){
const err6 = {instancePath:instancePath+"/organization/role",schemaPath:"#/definitions/organizationMembership/properties/role/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data1.department !== undefined){
if(typeof data1.department !== "string"){
const err7 = {instancePath:instancePath+"/organization/department",schemaPath:"#/definitions/organizationMembership/properties/department/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data1.departmentName !== undefined){
if(typeof data1.departmentName !== "string"){
const err8 = {instancePath:instancePath+"/organization/departmentName",schemaPath:"#/definitions/organizationMembership/properties/departmentName/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data1.dflt !== undefined){
if(typeof data1.dflt !== "boolean"){
const err9 = {instancePath:instancePath+"/organization/dflt",schemaPath:"#/definitions/organizationMembership/properties/dflt/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
else {
const err10 = {instancePath:instancePath+"/organization",schemaPath:"#/definitions/organizationMembership/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.account !== undefined){
let data8 = data.account;
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
if(data8.type === undefined){
const err11 = {instancePath:instancePath+"/account",schemaPath:"#/definitions/account/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data8.id === undefined){
const err12 = {instancePath:instancePath+"/account",schemaPath:"#/definitions/account/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data8.name === undefined){
const err13 = {instancePath:instancePath+"/account",schemaPath:"#/definitions/account/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
for(const key1 in data8){
if(!(((((key1 === "type") || (key1 === "id")) || (key1 === "name")) || (key1 === "department")) || (key1 === "departmentName"))){
const err14 = {instancePath:instancePath+"/account",schemaPath:"#/definitions/account/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data8.type !== undefined){
let data9 = data8.type;
if(typeof data9 !== "string"){
const err15 = {instancePath:instancePath+"/account/type",schemaPath:"#/definitions/account/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(!((data9 === "user") || (data9 === "organization"))){
const err16 = {instancePath:instancePath+"/account/type",schemaPath:"#/definitions/account/properties/type/enum",keyword:"enum",params:{allowedValues: schema21.properties.type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data8.id !== undefined){
if(typeof data8.id !== "string"){
const err17 = {instancePath:instancePath+"/account/id",schemaPath:"#/definitions/account/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data8.name !== undefined){
if(typeof data8.name !== "string"){
const err18 = {instancePath:instancePath+"/account/name",schemaPath:"#/definitions/account/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data8.department !== undefined){
if(typeof data8.department !== "string"){
const err19 = {instancePath:instancePath+"/account/department",schemaPath:"#/definitions/account/properties/department/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data8.departmentName !== undefined){
if(typeof data8.departmentName !== "string"){
const err20 = {instancePath:instancePath+"/account/departmentName",schemaPath:"#/definitions/account/properties/departmentName/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
}
else {
const err21 = {instancePath:instancePath+"/account",schemaPath:"#/definitions/account/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.accountRole !== undefined){
if(typeof data.accountRole !== "string"){
const err22 = {instancePath:instancePath+"/accountRole",schemaPath:"#/properties/accountRole/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.lang !== undefined){
if(typeof data.lang !== "string"){
const err23 = {instancePath:instancePath+"/lang",schemaPath:"#/properties/lang/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.dark !== undefined){
if(typeof data.dark !== "boolean"){
const err24 = {instancePath:instancePath+"/dark",schemaPath:"#/properties/dark/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
validate14.errors = vErrors;
return errors === 0;
}
