<script setup>
// @ts-nocheck

import { StatefulLayout } from '@json-layout/core'
import { ref, shallowRef, getCurrentInstance, useSlots, computed } from 'vue'
import { useElementSize } from '@vueuse/core'

import Tree from '@koumoul/vjsf/components/tree.vue'
import { useVjsf, emits } from '@koumoul/vjsf/composables/use-vjsf.js'
import '@koumoul/vjsf/styles/vjsf.css'


import sectionNode from '@koumoul/vjsf/components/nodes/section.vue'

import textfieldNode from '@koumoul/vjsf/components/nodes/text-field.vue'

import selectNode from '@koumoul/vjsf/components/nodes/select.vue'

import listNode from '@koumoul/vjsf/components/nodes/list.vue'

import oneofselectNode from '@koumoul/vjsf/components/nodes/one-of-select.vue'


import localizeErrors from "ajv-i18n/localize/fr/index.js";
const schema33 = {"$id":"export0","$ref":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0"};
const schema28 = {"type":"object","required":["discovery","client"],"properties":{"type":{"type":"string","title":"Type de founisseur","const":"oidc","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type","errorMessage":{}},"discovery":{"type":"string","title":"URL de découverte OICD","description":"probablement de la forme http://mon-fournisseur/.well-known/openid-configuration","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery","errorMessage":{}},"client":{"type":"object","required":["id","secret"],"properties":{"id":{"type":"string","title":"Identifiant du client","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id","errorMessage":{}},"secret":{"type":"string","title":"Secret","x-display":"textarea","writeOnly":true,"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client","errorMessage":{"required":{"id":"information obligatoire","secret":"information obligatoire"}}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0","errorMessage":{"required":{"discovery":"information obligatoire","client":"information obligatoire"}}};
const obj0 = {"required":"missingProperty","dependencies":"property","dependentRequired":"property"};

function validate26(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="export0" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate26.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.discovery === undefined){
const err0 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "discovery"},message:"must have required property '"+"discovery"+"'",schema:schema28.required,parentSchema:schema28,data};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.client === undefined){
const err1 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "client"},message:"must have required property '"+"client"+"'",schema:schema28.required,parentSchema:schema28,data};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.type !== undefined){
let data0 = data.type;
if(typeof data0 !== "string"){
const err2 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema28.properties.type.type,parentSchema:schema28.properties.type,data:data0};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if("oidc" !== data0){
const err3 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "oidc"},message:"must be equal to constant",schema:"oidc",parentSchema:schema28.properties.type,data:data0};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(errors > 0){
const emErrs0 = [];
for(const err4 of vErrors){
if(!err4.emUsed){
emErrs0.push(err4);
}
}
vErrors = emErrs0;
errors = emErrs0.length;
}
}
if(data.discovery !== undefined){
let data1 = data.discovery;
if(typeof data1 !== "string"){
const err5 = {instancePath:instancePath+"/discovery",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema28.properties.discovery.type,parentSchema:schema28.properties.discovery,data:data1};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(errors > 0){
const emErrs1 = [];
for(const err6 of vErrors){
if(!err6.emUsed){
emErrs1.push(err6);
}
}
vErrors = emErrs1;
errors = emErrs1.length;
}
}
if(data.client !== undefined){
let data2 = data.client;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.id === undefined){
const err7 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'",schema:schema28.properties.client.required,parentSchema:schema28.properties.client,data:data2};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data2.secret === undefined){
const err8 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "secret"},message:"must have required property '"+"secret"+"'",schema:schema28.properties.client.required,parentSchema:schema28.properties.client,data:data2};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2.id !== undefined){
let data3 = data2.id;
if(typeof data3 !== "string"){
const err9 = {instancePath:instancePath+"/client/id",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema28.properties.client.properties.id.type,parentSchema:schema28.properties.client.properties.id,data:data3};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(errors > 0){
const emErrs2 = [];
for(const err10 of vErrors){
if(!err10.emUsed){
emErrs2.push(err10);
}
}
vErrors = emErrs2;
errors = emErrs2.length;
}
}
if(data2.secret !== undefined){
let data4 = data2.secret;
if(typeof data4 !== "string"){
const err11 = {instancePath:instancePath+"/client/secret",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema28.properties.client.properties.secret.type,parentSchema:schema28.properties.client.properties.secret,data:data4};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(errors > 0){
const emErrs3 = [];
for(const err12 of vErrors){
if(!err12.emUsed){
emErrs3.push(err12);
}
}
vErrors = emErrs3;
errors = emErrs3.length;
}
}
}
else {
const err13 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema28.properties.client.type,parentSchema:schema28.properties.client,data:data2};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(errors > 0){
const emErrors0 = {"required":{"id":[],"secret":[]}};
const templates0 = {required:{}};
let emPropParams0;
let emParamsErrors0;
for(const err14 of vErrors){
if((((((err14.keyword !== "errorMessage") && (!err14.emUsed)) && (err14.instancePath === instancePath+"/client")) && (err14.keyword in emErrors0)) && (err14.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client") === 0)) && (/^\/[^\/]*$/.test(err14.schemaPath.slice(123)))){
emPropParams0 = obj0[err14.keyword];
emParamsErrors0 = emErrors0[err14.keyword][err14.params[emPropParams0]];
if(emParamsErrors0){
emParamsErrors0.push(err14);
err14.emUsed = true;
}
}
}
for(const key0 in emErrors0){
for(const keyProp0 in emErrors0[key0]){
emParamsErrors0 = emErrors0[key0][keyProp0];
if(emParamsErrors0.length){
const tmpl0 = templates0[key0] && templates0[key0][keyProp0];
const err15 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors0},message:tmpl0 ? tmpl0() : schema28.properties.client.errorMessage[key0][keyProp0],schema:schema28.properties.client.errorMessage,parentSchema:schema28.properties.client,data:data2};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
const emErrs4 = [];
for(const err16 of vErrors){
if(!err16.emUsed){
emErrs4.push(err16);
}
}
vErrors = emErrs4;
errors = emErrs4.length;
}
}
}
else {
const err17 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema28.type,parentSchema:schema28,data};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(errors > 0){
const emErrors1 = {"required":{"discovery":[],"client":[]}};
const templates1 = {required:{}};
let emPropParams1;
let emParamsErrors1;
for(const err18 of vErrors){
if((((((err18.keyword !== "errorMessage") && (!err18.emUsed)) && (err18.instancePath === instancePath)) && (err18.keyword in emErrors1)) && (err18.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0") === 0)) && (/^\/[^\/]*$/.test(err18.schemaPath.slice(105)))){
emPropParams1 = obj0[err18.keyword];
emParamsErrors1 = emErrors1[err18.keyword][err18.params[emPropParams1]];
if(emParamsErrors1){
emParamsErrors1.push(err18);
err18.emUsed = true;
}
}
}
for(const key1 in emErrors1){
for(const keyProp1 in emErrors1[key1]){
emParamsErrors1 = emErrors1[key1][keyProp1];
if(emParamsErrors1.length){
const tmpl1 = templates1[key1] && templates1[key1][keyProp1];
const err19 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors1},message:tmpl1 ? tmpl1() : schema28.errorMessage[key1][keyProp1],schema:schema28.errorMessage,parentSchema:schema28,data};
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
const emErrs5 = [];
for(const err20 of vErrors){
if(!err20.emUsed){
emErrs5.push(err20);
}
}
vErrors = emErrs5;
errors = emErrs5.length;
}
validate26.errors = vErrors;
return errors === 0;
}
validate26.evaluated = {"props":{"type":true,"discovery":true,"client":true},"dynamicProps":false,"dynamicItems":false};

const schema35 = {"$id":"export1","$ref":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items"};
const schema30 = {"type":"object","required":["title","type"],"properties":{"title":{"type":"string","title":"Nom","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title","errorMessage":{}},"color":{"type":"string","title":"Couleur","x-display":"color-picket","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color","errorMessage":{}},"img":{"type":"string","title":"Lien vers logo (petite taille)","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img","errorMessage":{}}},"oneOf":[{"type":"object","required":["discovery","client"],"properties":{"type":{"type":"string","title":"Type de founisseur","const":"oidc","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type","errorMessage":{}},"discovery":{"type":"string","title":"URL de découverte OICD","description":"probablement de la forme http://mon-fournisseur/.well-known/openid-configuration","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery","errorMessage":{}},"client":{"type":"object","required":["id","secret"],"properties":{"id":{"type":"string","title":"Identifiant du client","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id","errorMessage":{}},"secret":{"type":"string","title":"Secret","x-display":"textarea","writeOnly":true,"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client","errorMessage":{"required":{"id":"information obligatoire","secret":"information obligatoire"}}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0","errorMessage":{"required":{"discovery":"information obligatoire","client":"information obligatoire"}}}],"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items","errorMessage":{"oneOf":"choisissez une valeur","required":{"title":"information obligatoire"}}};

function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="export1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate27.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs2 = errors;
let valid1 = false;
let passing0 = null;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.discovery === undefined){
const err0 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "discovery"},message:"must have required property '"+"discovery"+"'",schema:schema30.oneOf[0].required,parentSchema:schema30.oneOf[0],data};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.client === undefined){
const err1 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "client"},message:"must have required property '"+"client"+"'",schema:schema30.oneOf[0].required,parentSchema:schema30.oneOf[0],data};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.type !== undefined){
let data0 = data.type;
if(typeof data0 !== "string"){
const err2 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema30.oneOf[0].properties.type.type,parentSchema:schema30.oneOf[0].properties.type,data:data0};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if("oidc" !== data0){
const err3 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "oidc"},message:"must be equal to constant",schema:"oidc",parentSchema:schema30.oneOf[0].properties.type,data:data0};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(errors > 0){
const emErrs0 = [];
for(const err4 of vErrors){
if(!err4.emUsed){
emErrs0.push(err4);
}
}
vErrors = emErrs0;
errors = emErrs0.length;
}
}
if(data.discovery !== undefined){
let data1 = data.discovery;
if(typeof data1 !== "string"){
const err5 = {instancePath:instancePath+"/discovery",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema30.oneOf[0].properties.discovery.type,parentSchema:schema30.oneOf[0].properties.discovery,data:data1};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(errors > 0){
const emErrs1 = [];
for(const err6 of vErrors){
if(!err6.emUsed){
emErrs1.push(err6);
}
}
vErrors = emErrs1;
errors = emErrs1.length;
}
}
if(data.client !== undefined){
let data2 = data.client;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.id === undefined){
const err7 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'",schema:schema30.oneOf[0].properties.client.required,parentSchema:schema30.oneOf[0].properties.client,data:data2};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data2.secret === undefined){
const err8 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "secret"},message:"must have required property '"+"secret"+"'",schema:schema30.oneOf[0].properties.client.required,parentSchema:schema30.oneOf[0].properties.client,data:data2};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2.id !== undefined){
let data3 = data2.id;
if(typeof data3 !== "string"){
const err9 = {instancePath:instancePath+"/client/id",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema30.oneOf[0].properties.client.properties.id.type,parentSchema:schema30.oneOf[0].properties.client.properties.id,data:data3};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(errors > 0){
const emErrs2 = [];
for(const err10 of vErrors){
if(!err10.emUsed){
emErrs2.push(err10);
}
}
vErrors = emErrs2;
errors = emErrs2.length;
}
}
if(data2.secret !== undefined){
let data4 = data2.secret;
if(typeof data4 !== "string"){
const err11 = {instancePath:instancePath+"/client/secret",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema30.oneOf[0].properties.client.properties.secret.type,parentSchema:schema30.oneOf[0].properties.client.properties.secret,data:data4};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(errors > 0){
const emErrs3 = [];
for(const err12 of vErrors){
if(!err12.emUsed){
emErrs3.push(err12);
}
}
vErrors = emErrs3;
errors = emErrs3.length;
}
}
}
else {
const err13 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema30.oneOf[0].properties.client.type,parentSchema:schema30.oneOf[0].properties.client,data:data2};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(errors > 0){
const emErrors0 = {"required":{"id":[],"secret":[]}};
const templates0 = {required:{}};
let emPropParams0;
let emParamsErrors0;
for(const err14 of vErrors){
if((((((err14.keyword !== "errorMessage") && (!err14.emUsed)) && (err14.instancePath === instancePath+"/client")) && (err14.keyword in emErrors0)) && (err14.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client") === 0)) && (/^\/[^\/]*$/.test(err14.schemaPath.slice(123)))){
emPropParams0 = obj0[err14.keyword];
emParamsErrors0 = emErrors0[err14.keyword][err14.params[emPropParams0]];
if(emParamsErrors0){
emParamsErrors0.push(err14);
err14.emUsed = true;
}
}
}
for(const key0 in emErrors0){
for(const keyProp0 in emErrors0[key0]){
emParamsErrors0 = emErrors0[key0][keyProp0];
if(emParamsErrors0.length){
const tmpl0 = templates0[key0] && templates0[key0][keyProp0];
const err15 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors0},message:tmpl0 ? tmpl0() : schema30.oneOf[0].properties.client.errorMessage[key0][keyProp0],schema:schema30.oneOf[0].properties.client.errorMessage,parentSchema:schema30.oneOf[0].properties.client,data:data2};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
const emErrs4 = [];
for(const err16 of vErrors){
if(!err16.emUsed){
emErrs4.push(err16);
}
}
vErrors = emErrs4;
errors = emErrs4.length;
}
}
}
else {
const err17 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema30.oneOf[0].type,parentSchema:schema30.oneOf[0],data};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(errors > 0){
const emErrors1 = {"required":{"discovery":[],"client":[]}};
const templates1 = {required:{}};
let emPropParams1;
let emParamsErrors1;
for(const err18 of vErrors){
if((((((err18.keyword !== "errorMessage") && (!err18.emUsed)) && (err18.instancePath === instancePath)) && (err18.keyword in emErrors1)) && (err18.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0") === 0)) && (/^\/[^\/]*$/.test(err18.schemaPath.slice(105)))){
emPropParams1 = obj0[err18.keyword];
emParamsErrors1 = emErrors1[err18.keyword][err18.params[emPropParams1]];
if(emParamsErrors1){
emParamsErrors1.push(err18);
err18.emUsed = true;
}
}
}
for(const key1 in emErrors1){
for(const keyProp1 in emErrors1[key1]){
emParamsErrors1 = emErrors1[key1][keyProp1];
if(emParamsErrors1.length){
const tmpl1 = templates1[key1] && templates1[key1][keyProp1];
const err19 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors1},message:tmpl1 ? tmpl1() : schema30.oneOf[0].errorMessage[key1][keyProp1],schema:schema30.oneOf[0].errorMessage,parentSchema:schema30.oneOf[0],data};
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
const emErrs5 = [];
for(const err20 of vErrors){
if(!err20.emUsed){
emErrs5.push(err20);
}
}
vErrors = emErrs5;
errors = emErrs5.length;
}
var _valid0 = _errs3 === errors;
if(_valid0){
valid1 = true;
passing0 = 0;
var props0 = {};
props0.type = true;
props0.discovery = true;
props0.client = true;
}
if(!valid1){
const err21 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf",schema:schema30.oneOf,parentSchema:schema30,data};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
else {
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.title === undefined){
const err22 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "title"},message:"must have required property '"+"title"+"'",schema:schema30.required,parentSchema:schema30,data};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data.type === undefined){
const err23 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'",schema:schema30.required,parentSchema:schema30,data};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(props0 !== true){
props0 = props0 || {};
props0.title = true;
props0.color = true;
props0.img = true;
}
if(data.title !== undefined){
let data5 = data.title;
if(typeof data5 !== "string"){
const err24 = {instancePath:instancePath+"/title",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema30.properties.title.type,parentSchema:schema30.properties.title,data:data5};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(errors > 0){
const emErrs6 = [];
for(const err25 of vErrors){
if(!err25.emUsed){
emErrs6.push(err25);
}
}
vErrors = emErrs6;
errors = emErrs6.length;
}
}
if(data.color !== undefined){
let data6 = data.color;
if(typeof data6 !== "string"){
const err26 = {instancePath:instancePath+"/color",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema30.properties.color.type,parentSchema:schema30.properties.color,data:data6};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(errors > 0){
const emErrs7 = [];
for(const err27 of vErrors){
if(!err27.emUsed){
emErrs7.push(err27);
}
}
vErrors = emErrs7;
errors = emErrs7.length;
}
}
if(data.img !== undefined){
let data7 = data.img;
if(typeof data7 !== "string"){
const err28 = {instancePath:instancePath+"/img",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema30.properties.img.type,parentSchema:schema30.properties.img,data:data7};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(errors > 0){
const emErrs8 = [];
for(const err29 of vErrors){
if(!err29.emUsed){
emErrs8.push(err29);
}
}
vErrors = emErrs8;
errors = emErrs8.length;
}
}
}
else {
const err30 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema30.type,parentSchema:schema30,data};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(errors > 0){
const emErrors2 = {"oneOf":[]};
const templates2 = {};
for(const err31 of vErrors){
if((((((err31.keyword !== "errorMessage") && (!err31.emUsed)) && (err31.instancePath === instancePath)) && (err31.keyword in emErrors2)) && (err31.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err31.schemaPath.slice(97)))){
emErrors2[err31.keyword].push(err31);
err31.emUsed = true;
}
}
for(const key2 in emErrors2){
if(emErrors2[key2].length){
const err32 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emErrors2[key2]},message:key2 in templates2 ? templates2[key2]() : schema30.errorMessage[key2],schema:schema30.errorMessage,parentSchema:schema30,data};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
const emErrors3 = {"required":{"title":[]}};
const templates3 = {required:{}};
let emPropParams2;
let emParamsErrors2;
for(const err33 of vErrors){
if((((((err33.keyword !== "errorMessage") && (!err33.emUsed)) && (err33.instancePath === instancePath)) && (err33.keyword in emErrors3)) && (err33.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err33.schemaPath.slice(97)))){
emPropParams2 = obj0[err33.keyword];
emParamsErrors2 = emErrors3[err33.keyword][err33.params[emPropParams2]];
if(emParamsErrors2){
emParamsErrors2.push(err33);
err33.emUsed = true;
}
}
}
for(const key3 in emErrors3){
for(const keyProp2 in emErrors3[key3]){
emParamsErrors2 = emErrors3[key3][keyProp2];
if(emParamsErrors2.length){
const tmpl2 = templates3[key3] && templates3[key3][keyProp2];
const err34 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors2},message:tmpl2 ? tmpl2() : schema30.errorMessage[key3][keyProp2],schema:schema30.errorMessage,parentSchema:schema30,data};
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
const emErrs9 = [];
for(const err35 of vErrors){
if(!err35.emUsed){
emErrs9.push(err35);
}
}
vErrors = emErrs9;
errors = emErrs9.length;
}
validate27.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate27.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema37 = {"$id":"export2","$ref":"https://github.com/data-fair/simple-directory/site-patch-resolved#"};
const schema27 = {"$id":"https://github.com/data-fair/simple-directory/site-patch-resolved","x-exports":["types","validate","resolvedSchema","vjsf"],"title":"site-patch","type":"object","additionalProperties":false,"required":["_id","authMode"],"properties":{"_id":{"readOnly":true,"type":"string","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/_id","errorMessage":{}},"authMode":{"default":"onlyBackOffice","title":"Mode d'authentification","type":"string","oneOf":[{"const":"onlyLocal","title":"uniquement sur le site lui même"},{"const":"onlyBackOffice","title":"uniquement sur le back-office"},{"const":"ssoBackOffice","title":"sur le site et sur le back-office par SSO"}],"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode","errorMessage":{"oneOf":"choisissez une valeur"}},"authProviders":{"type":"array","title":"Fournisseurs d'identité (SSO)","items":{"type":"object","required":["title","type"],"properties":{"title":{"type":"string","title":"Nom","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title","errorMessage":{}},"color":{"type":"string","title":"Couleur","x-display":"color-picket","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color","errorMessage":{}},"img":{"type":"string","title":"Lien vers logo (petite taille)","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img","errorMessage":{}}},"oneOf":[{"type":"object","required":["discovery","client"],"properties":{"type":{"type":"string","title":"Type de founisseur","const":"oidc","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type","errorMessage":{}},"discovery":{"type":"string","title":"URL de découverte OICD","description":"probablement de la forme http://mon-fournisseur/.well-known/openid-configuration","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery","errorMessage":{}},"client":{"type":"object","required":["id","secret"],"properties":{"id":{"type":"string","title":"Identifiant du client","__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id","errorMessage":{}},"secret":{"type":"string","title":"Secret","x-display":"textarea","writeOnly":true,"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client","errorMessage":{"required":{"id":"information obligatoire","secret":"information obligatoire"}}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0","errorMessage":{"required":{"discovery":"information obligatoire","client":"information obligatoire"}}}],"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items","errorMessage":{"oneOf":"choisissez une valeur","required":{"title":"information obligatoire"}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch-resolved#","errorMessage":{"required":{"_id":"information obligatoire","authMode":"information obligatoire"}}};

function validate28(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="export2" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate28.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data._id === undefined){
const err0 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/required",keyword:"required",params:{missingProperty: "_id"},message:"must have required property '"+"_id"+"'",schema:schema27.required,parentSchema:schema27,data};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.authMode === undefined){
const err1 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/required",keyword:"required",params:{missingProperty: "authMode"},message:"must have required property '"+"authMode"+"'",schema:schema27.required,parentSchema:schema27,data};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "_id") || (key0 === "authMode")) || (key0 === "authProviders"))){
const err2 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties",schema:false,parentSchema:schema27,data};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data._id !== undefined){
let data0 = data._id;
if(typeof data0 !== "string"){
const err3 = {instancePath:instancePath+"/_id",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/_id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties._id.type,parentSchema:schema27.properties._id,data:data0};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(errors > 0){
const emErrs0 = [];
for(const err4 of vErrors){
if(!err4.emUsed){
emErrs0.push(err4);
}
}
vErrors = emErrs0;
errors = emErrs0.length;
}
}
if(data.authMode !== undefined){
let data1 = data.authMode;
if(typeof data1 !== "string"){
const err5 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authMode.type,parentSchema:schema27.properties.authMode,data:data1};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
const _errs7 = errors;
let valid2 = false;
let passing0 = null;
const _errs8 = errors;
if("onlyLocal" !== data1){
const err6 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode/oneOf/0/const",keyword:"const",params:{allowedValue: "onlyLocal"},message:"must be equal to constant",schema:"onlyLocal",parentSchema:schema27.properties.authMode.oneOf[0],data:data1};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var _valid0 = _errs8 === errors;
if(_valid0){
valid2 = true;
passing0 = 0;
}
const _errs9 = errors;
if("onlyBackOffice" !== data1){
const err7 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode/oneOf/1/const",keyword:"const",params:{allowedValue: "onlyBackOffice"},message:"must be equal to constant",schema:"onlyBackOffice",parentSchema:schema27.properties.authMode.oneOf[1],data:data1};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
var _valid0 = _errs9 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid2 = true;
passing0 = 1;
}
const _errs10 = errors;
if("ssoBackOffice" !== data1){
const err8 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode/oneOf/2/const",keyword:"const",params:{allowedValue: "ssoBackOffice"},message:"must be equal to constant",schema:"ssoBackOffice",parentSchema:schema27.properties.authMode.oneOf[2],data:data1};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid2 = true;
passing0 = 2;
}
}
}
if(!valid2){
const err9 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf",schema:schema27.properties.authMode.oneOf,parentSchema:schema27.properties.authMode,data:data1};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
else {
errors = _errs7;
if(vErrors !== null){
if(_errs7){
vErrors.length = _errs7;
}
else {
vErrors = null;
}
}
}
if(errors > 0){
const emErrors0 = {"oneOf":[]};
const templates0 = {};
for(const err10 of vErrors){
if((((((err10.keyword !== "errorMessage") && (!err10.emUsed)) && (err10.instancePath === instancePath+"/authMode")) && (err10.keyword in emErrors0)) && (err10.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode") === 0)) && (/^\/[^\/]*$/.test(err10.schemaPath.slice(86)))){
emErrors0[err10.keyword].push(err10);
err10.emUsed = true;
}
}
for(const key1 in emErrors0){
if(emErrors0[key1].length){
const err11 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode/errorMessage",keyword:"errorMessage",params:{errors: emErrors0[key1]},message:key1 in templates0 ? templates0[key1]() : schema27.properties.authMode.errorMessage[key1],schema:schema27.properties.authMode.errorMessage,parentSchema:schema27.properties.authMode,data:data1};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
const emErrs1 = [];
for(const err12 of vErrors){
if(!err12.emUsed){
emErrs1.push(err12);
}
}
vErrors = emErrs1;
errors = emErrs1.length;
}
}
if(data.authProviders !== undefined){
let data2 = data.authProviders;
if(Array.isArray(data2)){
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
let data3 = data2[i0];
const _errs15 = errors;
let valid5 = false;
let passing1 = null;
const _errs16 = errors;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.discovery === undefined){
const err13 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "discovery"},message:"must have required property '"+"discovery"+"'",schema:schema27.properties.authProviders.items.oneOf[0].required,parentSchema:schema27.properties.authProviders.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data3.client === undefined){
const err14 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "client"},message:"must have required property '"+"client"+"'",schema:schema27.properties.authProviders.items.oneOf[0].required,parentSchema:schema27.properties.authProviders.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data3.type !== undefined){
let data4 = data3.type;
if(typeof data4 !== "string"){
const err15 = {instancePath:instancePath+"/authProviders/" + i0+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authProviders.items.oneOf[0].properties.type.type,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.type,data:data4};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if("oidc" !== data4){
const err16 = {instancePath:instancePath+"/authProviders/" + i0+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "oidc"},message:"must be equal to constant",schema:"oidc",parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.type,data:data4};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(errors > 0){
const emErrs2 = [];
for(const err17 of vErrors){
if(!err17.emUsed){
emErrs2.push(err17);
}
}
vErrors = emErrs2;
errors = emErrs2.length;
}
}
if(data3.discovery !== undefined){
let data5 = data3.discovery;
if(typeof data5 !== "string"){
const err18 = {instancePath:instancePath+"/authProviders/" + i0+"/discovery",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authProviders.items.oneOf[0].properties.discovery.type,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.discovery,data:data5};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(errors > 0){
const emErrs3 = [];
for(const err19 of vErrors){
if(!err19.emUsed){
emErrs3.push(err19);
}
}
vErrors = emErrs3;
errors = emErrs3.length;
}
}
if(data3.client !== undefined){
let data6 = data3.client;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.id === undefined){
const err20 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'",schema:schema27.properties.authProviders.items.oneOf[0].properties.client.required,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.client,data:data6};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data6.secret === undefined){
const err21 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "secret"},message:"must have required property '"+"secret"+"'",schema:schema27.properties.authProviders.items.oneOf[0].properties.client.required,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.client,data:data6};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data6.id !== undefined){
let data7 = data6.id;
if(typeof data7 !== "string"){
const err22 = {instancePath:instancePath+"/authProviders/" + i0+"/client/id",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authProviders.items.oneOf[0].properties.client.properties.id.type,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.client.properties.id,data:data7};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(errors > 0){
const emErrs4 = [];
for(const err23 of vErrors){
if(!err23.emUsed){
emErrs4.push(err23);
}
}
vErrors = emErrs4;
errors = emErrs4.length;
}
}
if(data6.secret !== undefined){
let data8 = data6.secret;
if(typeof data8 !== "string"){
const err24 = {instancePath:instancePath+"/authProviders/" + i0+"/client/secret",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authProviders.items.oneOf[0].properties.client.properties.secret.type,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.client.properties.secret,data:data8};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(errors > 0){
const emErrs5 = [];
for(const err25 of vErrors){
if(!err25.emUsed){
emErrs5.push(err25);
}
}
vErrors = emErrs5;
errors = emErrs5.length;
}
}
}
else {
const err26 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema27.properties.authProviders.items.oneOf[0].properties.client.type,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.client,data:data6};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(errors > 0){
const emErrors1 = {"required":{"id":[],"secret":[]}};
const templates1 = {required:{}};
let emPropParams0;
let emParamsErrors0;
for(const err27 of vErrors){
if((((((err27.keyword !== "errorMessage") && (!err27.emUsed)) && (err27.instancePath === instancePath+"/authProviders/" + i0+"/client")) && (err27.keyword in emErrors1)) && (err27.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client") === 0)) && (/^\/[^\/]*$/.test(err27.schemaPath.slice(123)))){
emPropParams0 = obj0[err27.keyword];
emParamsErrors0 = emErrors1[err27.keyword][err27.params[emPropParams0]];
if(emParamsErrors0){
emParamsErrors0.push(err27);
err27.emUsed = true;
}
}
}
for(const key2 in emErrors1){
for(const keyProp0 in emErrors1[key2]){
emParamsErrors0 = emErrors1[key2][keyProp0];
if(emParamsErrors0.length){
const tmpl0 = templates1[key2] && templates1[key2][keyProp0];
const err28 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors0},message:tmpl0 ? tmpl0() : schema27.properties.authProviders.items.oneOf[0].properties.client.errorMessage[key2][keyProp0],schema:schema27.properties.authProviders.items.oneOf[0].properties.client.errorMessage,parentSchema:schema27.properties.authProviders.items.oneOf[0].properties.client,data:data6};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
}
const emErrs6 = [];
for(const err29 of vErrors){
if(!err29.emUsed){
emErrs6.push(err29);
}
}
vErrors = emErrs6;
errors = emErrs6.length;
}
}
}
else {
const err30 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema27.properties.authProviders.items.oneOf[0].type,parentSchema:schema27.properties.authProviders.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(errors > 0){
const emErrors2 = {"required":{"discovery":[],"client":[]}};
const templates2 = {required:{}};
let emPropParams1;
let emParamsErrors1;
for(const err31 of vErrors){
if((((((err31.keyword !== "errorMessage") && (!err31.emUsed)) && (err31.instancePath === instancePath+"/authProviders/" + i0)) && (err31.keyword in emErrors2)) && (err31.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0") === 0)) && (/^\/[^\/]*$/.test(err31.schemaPath.slice(105)))){
emPropParams1 = obj0[err31.keyword];
emParamsErrors1 = emErrors2[err31.keyword][err31.params[emPropParams1]];
if(emParamsErrors1){
emParamsErrors1.push(err31);
err31.emUsed = true;
}
}
}
for(const key3 in emErrors2){
for(const keyProp1 in emErrors2[key3]){
emParamsErrors1 = emErrors2[key3][keyProp1];
if(emParamsErrors1.length){
const tmpl1 = templates2[key3] && templates2[key3][keyProp1];
const err32 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors1},message:tmpl1 ? tmpl1() : schema27.properties.authProviders.items.oneOf[0].errorMessage[key3][keyProp1],schema:schema27.properties.authProviders.items.oneOf[0].errorMessage,parentSchema:schema27.properties.authProviders.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
}
const emErrs7 = [];
for(const err33 of vErrors){
if(!err33.emUsed){
emErrs7.push(err33);
}
}
vErrors = emErrs7;
errors = emErrs7.length;
}
var _valid1 = _errs16 === errors;
if(_valid1){
valid5 = true;
passing1 = 0;
var props0 = {};
props0.type = true;
props0.discovery = true;
props0.client = true;
}
if(!valid5){
const err34 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf",schema:schema27.properties.authProviders.items.oneOf,parentSchema:schema27.properties.authProviders.items,data:data3};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
else {
errors = _errs15;
if(vErrors !== null){
if(_errs15){
vErrors.length = _errs15;
}
else {
vErrors = null;
}
}
}
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.title === undefined){
const err35 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "title"},message:"must have required property '"+"title"+"'",schema:schema27.properties.authProviders.items.required,parentSchema:schema27.properties.authProviders.items,data:data3};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data3.type === undefined){
const err36 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'",schema:schema27.properties.authProviders.items.required,parentSchema:schema27.properties.authProviders.items,data:data3};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(props0 !== true){
props0 = props0 || {};
props0.title = true;
props0.color = true;
props0.img = true;
}
if(data3.title !== undefined){
let data9 = data3.title;
if(typeof data9 !== "string"){
const err37 = {instancePath:instancePath+"/authProviders/" + i0+"/title",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authProviders.items.properties.title.type,parentSchema:schema27.properties.authProviders.items.properties.title,data:data9};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(errors > 0){
const emErrs8 = [];
for(const err38 of vErrors){
if(!err38.emUsed){
emErrs8.push(err38);
}
}
vErrors = emErrs8;
errors = emErrs8.length;
}
}
if(data3.color !== undefined){
let data10 = data3.color;
if(typeof data10 !== "string"){
const err39 = {instancePath:instancePath+"/authProviders/" + i0+"/color",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authProviders.items.properties.color.type,parentSchema:schema27.properties.authProviders.items.properties.color,data:data10};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(errors > 0){
const emErrs9 = [];
for(const err40 of vErrors){
if(!err40.emUsed){
emErrs9.push(err40);
}
}
vErrors = emErrs9;
errors = emErrs9.length;
}
}
if(data3.img !== undefined){
let data11 = data3.img;
if(typeof data11 !== "string"){
const err41 = {instancePath:instancePath+"/authProviders/" + i0+"/img",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema27.properties.authProviders.items.properties.img.type,parentSchema:schema27.properties.authProviders.items.properties.img,data:data11};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(errors > 0){
const emErrs10 = [];
for(const err42 of vErrors){
if(!err42.emUsed){
emErrs10.push(err42);
}
}
vErrors = emErrs10;
errors = emErrs10.length;
}
}
}
else {
const err43 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema27.properties.authProviders.items.type,parentSchema:schema27.properties.authProviders.items,data:data3};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(errors > 0){
const emErrors3 = {"oneOf":[]};
const templates3 = {};
for(const err44 of vErrors){
if((((((err44.keyword !== "errorMessage") && (!err44.emUsed)) && (err44.instancePath === instancePath+"/authProviders/" + i0)) && (err44.keyword in emErrors3)) && (err44.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err44.schemaPath.slice(97)))){
emErrors3[err44.keyword].push(err44);
err44.emUsed = true;
}
}
for(const key4 in emErrors3){
if(emErrors3[key4].length){
const err45 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emErrors3[key4]},message:key4 in templates3 ? templates3[key4]() : schema27.properties.authProviders.items.errorMessage[key4],schema:schema27.properties.authProviders.items.errorMessage,parentSchema:schema27.properties.authProviders.items,data:data3};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
const emErrors4 = {"required":{"title":[]}};
const templates4 = {required:{}};
let emPropParams2;
let emParamsErrors2;
for(const err46 of vErrors){
if((((((err46.keyword !== "errorMessage") && (!err46.emUsed)) && (err46.instancePath === instancePath+"/authProviders/" + i0)) && (err46.keyword in emErrors4)) && (err46.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err46.schemaPath.slice(97)))){
emPropParams2 = obj0[err46.keyword];
emParamsErrors2 = emErrors4[err46.keyword][err46.params[emPropParams2]];
if(emParamsErrors2){
emParamsErrors2.push(err46);
err46.emUsed = true;
}
}
}
for(const key5 in emErrors4){
for(const keyProp2 in emErrors4[key5]){
emParamsErrors2 = emErrors4[key5][keyProp2];
if(emParamsErrors2.length){
const tmpl2 = templates4[key5] && templates4[key5][keyProp2];
const err47 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors2},message:tmpl2 ? tmpl2() : schema27.properties.authProviders.items.errorMessage[key5][keyProp2],schema:schema27.properties.authProviders.items.errorMessage,parentSchema:schema27.properties.authProviders.items,data:data3};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
}
const emErrs11 = [];
for(const err48 of vErrors){
if(!err48.emUsed){
emErrs11.push(err48);
}
}
vErrors = emErrs11;
errors = emErrs11.length;
}
}
}
else {
const err49 = {instancePath:instancePath+"/authProviders",schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/type",keyword:"type",params:{type: "array"},message:"must be array",schema:schema27.properties.authProviders.type,parentSchema:schema27.properties.authProviders,data:data2};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
if(errors > 0){
const emErrs12 = [];
for(const err50 of vErrors){
if(!err50.emUsed){
emErrs12.push(err50);
}
}
vErrors = emErrs12;
errors = emErrs12.length;
}
}
}
else {
const err51 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema27.type,parentSchema:schema27,data};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(errors > 0){
const emErrors5 = {"required":{"_id":[],"authMode":[]}};
const templates5 = {required:{}};
let emPropParams3;
let emParamsErrors3;
for(const err52 of vErrors){
if((((((err52.keyword !== "errorMessage") && (!err52.emUsed)) && (err52.instancePath === instancePath)) && (err52.keyword in emErrors5)) && (err52.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site-patch-resolved#") === 0)) && (/^\/[^\/]*$/.test(err52.schemaPath.slice(66)))){
emPropParams3 = obj0[err52.keyword];
emParamsErrors3 = emErrors5[err52.keyword][err52.params[emPropParams3]];
if(emParamsErrors3){
emParamsErrors3.push(err52);
err52.emUsed = true;
}
}
}
for(const key6 in emErrors5){
for(const keyProp3 in emErrors5[key6]){
emParamsErrors3 = emErrors5[key6][keyProp3];
if(emParamsErrors3.length){
const tmpl3 = templates5[key6] && templates5[key6][keyProp3];
const err53 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site-patch-resolved#/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors3},message:tmpl3 ? tmpl3() : schema27.errorMessage[key6][keyProp3],schema:schema27.errorMessage,parentSchema:schema27,data};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
}
const emErrs13 = [];
for(const err54 of vErrors){
if(!err54.emUsed){
emErrs13.push(err54);
}
}
vErrors = emErrs13;
errors = emErrs13.length;
}
validate28.errors = vErrors;
return errors === 0;
}
validate28.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
function expression0(data,value,options,context,display,layout,readOnly,summary,validates
) {
return (layout.defaultData)
}function expression1(data,value,options,context,display,layout,readOnly,summary,validates
) {
return (layout.options)
}function expression2(data,value,options,context,display,layout,readOnly,summary,validates
) {
return ([{"const":"onlyLocal","title":"uniquement sur le site lui même","key":"onlyLocal","value":"onlyLocal"},{"const":"onlyBackOffice","title":"uniquement sur le back-office","key":"onlyBackOffice","value":"onlyBackOffice"},{"const":"ssoBackOffice","title":"sur le site et sur le back-office par SSO","key":"ssoBackOffice","value":"ssoBackOffice"}])
}function expression3(data,value,options,context,display,layout,readOnly,summary,validates
) {
return (layout.constData)
}

const compiledLayout = {
  mainTree: "https://github.com/data-fair/simple-directory/site-patch-resolved#",

  skeletonTrees: {
    "https://github.com/data-fair/simple-directory/site-patch-resolved#": {
      title: "main",
      root: "https://github.com/data-fair/simple-directory/site-patch-resolved#",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items": {
      title: undefined,
      root: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0": {
      title: "OpenID Connect",
      root: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0"
    }
  },

  skeletonNodes: {
    "https://github.com/data-fair/simple-directory/site-patch-resolved#": {
      key: "",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#",
      pure: true,
      propertyKeys: ["_id", "authMode", "authProviders"],
      roPropertyKeys: ["_id"],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/_id", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders"]
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/_id": {
      key: "_id",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/_id",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/_id",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode": {
      key: "authMode",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders": {
      key: "authProviders",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false,
      childrenTrees: ["https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items"]
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items": {
      key: "",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items",
      pure: true,
      propertyKeys: ["title", "color", "img"],
      roPropertyKeys: [],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf"]
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title": {
      key: "title",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color": {
      key: "color",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img": {
      key: "img",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0": {
      key: "",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0",
      pure: true,
      propertyKeys: ["type", "discovery", "client"],
      roPropertyKeys: [],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client"]
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type": {
      key: "type",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery": {
      key: "discovery",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client": {
      key: "client",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client",
      pure: true,
      propertyKeys: ["id", "secret"],
      roPropertyKeys: [],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id", "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret"]
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id": {
      key: "id",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret": {
      key: "secret",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf": {
      key: "$oneOf",
      pointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf",
      childrenTrees: ["https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0"],
      pure: true,
      propertyKeys: [],
      roPropertyKeys: []
    }
  },

  normalizedLayouts: {
    "https://github.com/data-fair/simple-directory/site-patch-resolved#": {
      comp: "section",

      children: [{
        key: "_id"
      }, {
        key: "authMode"
      }, {
        key: "authProviders"
      }],

      title: "site-patch",
      defaultData: {},

      getDefaultData: {
        type: "js-eval",
        expr: "layout.defaultData",
        pure: true,
        dataAlias: "value",
        ref: 0
      }
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/_id": {
      comp: "text-field",

      options: {
        readOnly: true
      },

      label: "_id",

      getOptions: {
        type: "js-eval",
        expr: "layout.options",
        pure: true,
        dataAlias: "value",
        ref: 1
      }
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authMode": {
      comp: "select",

      getItems: {
        pure: true,
        type: "js-eval",
        dataAlias: "value",
        expr: "[{\"const\":\"onlyLocal\",\"title\":\"uniquement sur le site lui même\",\"key\":\"onlyLocal\",\"value\":\"onlyLocal\"},{\"const\":\"onlyBackOffice\",\"title\":\"uniquement sur le back-office\",\"key\":\"onlyBackOffice\",\"value\":\"onlyBackOffice\"},{\"const\":\"ssoBackOffice\",\"title\":\"sur le site et sur le back-office par SSO\",\"key\":\"ssoBackOffice\",\"value\":\"ssoBackOffice\"}]",
        immutable: true,
        ref: 2
      },

      label: "Mode d'authentification",
      defaultData: "onlyBackOffice",

      getDefaultData: {
        type: "js-eval",
        expr: "layout.defaultData",
        pure: true,
        dataAlias: "value",
        ref: 0
      }
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders": {
      comp: "list",
      title: "Fournisseurs d'identité (SSO)",
      listEditMode: "inline-single",
      listActions: ["add", "edit", "delete", "sort", "duplicate"]
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items": {
      comp: "section",

      children: [{
        key: "title"
      }, {
        key: "color"
      }, {
        key: "img"
      }, {
        key: "$oneOf"
      }],

      title: null,
      defaultData: {},

      getDefaultData: {
        type: "js-eval",
        expr: "layout.defaultData",
        pure: true,
        dataAlias: "value",
        ref: 0
      },

      nullable: true
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/title": {
      comp: "text-field",
      label: "Nom"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/color": {
      comp: "text-field",
      label: "Couleur"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/properties/img": {
      comp: "text-field",
      label: "Lien vers logo (petite taille)"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf": {
      comp: "one-of-select"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0": {
      comp: "section",

      children: [{
        key: "type"
      }, {
        key: "discovery"
      }, {
        key: "client"
      }],

      title: null,
      defaultData: {},

      getDefaultData: {
        type: "js-eval",
        expr: "layout.defaultData",
        pure: true,
        dataAlias: "value",
        ref: 0
      }
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/type": {
      comp: "none",
      constData: "oidc",

      getConstData: {
        type: "js-eval",
        expr: "layout.constData",
        pure: true,
        dataAlias: "value",
        ref: 3
      }
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/discovery": {
      comp: "text-field",
      label: "URL de découverte OICD",
      help: "<p>probablement de la forme <a href=\"http://mon-fournisseur/.well-known/openid-configuration\">http://mon-fournisseur/.well-known/openid-configuration</a></p>"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client": {
      comp: "section",

      children: [{
        key: "id"
      }, {
        key: "secret"
      }],

      title: null,
      defaultData: {},

      getDefaultData: {
        type: "js-eval",
        expr: "layout.defaultData",
        pure: true,
        dataAlias: "value",
        ref: 0
      }
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/id": {
      comp: "text-field",
      label: "Identifiant du client"
    },

    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0/properties/client/properties/secret": {
      comp: "text-field",
      label: "Secret"
    }
  },

  validates: {
    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items/oneOf/0": validate26,
    "https://github.com/data-fair/simple-directory/site-patch-resolved#/properties/authProviders/items": validate27,
    "https://github.com/data-fair/simple-directory/site-patch-resolved#": validate28
  },

  validationErrors: {},
  expressions: [expression0, expression1, expression2, expression3],
  locale: "fr",

  messages: {
    errorOneOf: "choisissez une valeur",
    errorRequired: "information obligatoire",
    addItem: "Ajouter un élément",
    delete: "Supprimer",
    edit: "Éditer",
    confirm: "Confirmer",
    close: "Fermer",
    duplicate: "Dupliquer",
    sort: "Trier",
    up: "Décaler vers le haut",
    down: "Décaler vers le bas",
    showHelp: "Afficher un message d'aide",
    mdeLink1: "[titre du lien",
    mdeLink2: "](adresse du lien)",
    mdeImg1: "![](",
    mdeImg2: "adresse de l'image)",
    mdeTable1: "",
    mdeTable2: "\n\n| Colonne 1 | Colonne 2 | Colonne 3 |\n| -------- | -------- | -------- |\n| Texte     | Texte     | Texte     |\n\n",
    bold: "Gras",
    italic: "Italique",
    heading: "Titre",
    quote: "Citation",
    unorderedList: "Liste à puce",
    orderedList: "Liste numérotée",
    createLink: "Créer un lien",
    insertImage: "Insérer une image",
    createTable: "Créer un tableau",
    preview: "Preview",
    mdeGuide: "Syntax documentation",
    undo: "Défaire",
    redo: "Refaire",
    default: "défaut : ",
    name: "nom : ",
    examples: "Exemples : ",
    deprecated: "Attention, cette information est obsolète.",
    keyboardDate: "JJ/MM/AAAA",
    keyboardDateTime: "JJ/MM/AAAA HH:mm"
  },

  components: {
    section: {
      name: "section",
      composite: true
    },

    "text-field": {
      name: "text-field",
      shouldDebounce: true,
      focusable: true,
      emitsBlur: true
    },

    select: {
      name: "select",
      focusable: true,
      itemsBased: true,
      multipleCompat: true
    },

    list: {
      name: "list",
      itemsBased: true
    },

    "one-of-select": {
      name: "one-of-select"
    },

    none: {
      name: "none"
    }
  },

  localizeErrors: localizeErrors
};

const nodeComponents = {
  
  "section": sectionNode,
  
  "text-field": textfieldNode,
  
  "select": selectNode,
  
  "list": listNode,
  
  "one-of-select": oneofselectNode,
    
}

const props = defineProps({
  modelValue: {
    type: null,
    default: null
  },
  options: {
    /** @type import('vue').PropType<import('@koumoul/vjsf/types.js').PartialVjsfOptions | null> */
    type: Object,
    default: null
  }
})

const emit = defineEmits(emits)

const { el, statefulLayout, stateTree } = useVjsf(
  null,
  computed(() => props.modelValue),
  computed(() => ({...props.options, components: {}})),
  nodeComponents,
  emit,
  null,
  computed(() => compiledLayout)
)
</script>

<template>
  <div
    ref="el"
    class="vjsf"
  >
    <tree
      v-if="statefulLayout && stateTree"
      :model-value="stateTree"
      :stateful-layout="statefulLayout"
    />
  </div>
</template>