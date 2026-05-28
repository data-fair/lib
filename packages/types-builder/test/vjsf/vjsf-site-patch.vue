<script setup>
// @ts-nocheck

import { StatefulLayout } from '@json-layout/core/state'
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
const schema26 = {"$id":"export0","$ref":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0"};
const schema37 = {"type":"object","title":"OpenID Connect","required":["discovery","client"],"properties":{"type":{"type":"string","title":"Type de founisseur","const":"oidc","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type","errorMessage":{}},"discovery":{"type":"string","title":"URL de découverte OICD","description":"probablement de la forme http://mon-fournisseur/.well-known/openid-configuration","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery","errorMessage":{}},"client":{"type":"object","required":["id","secret"],"properties":{"id":{"type":"string","title":"Identifiant du client","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id","errorMessage":{}},"secret":{"type":"string","title":"Secret","x-display":"textarea","writeOnly":true,"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client","errorMessage":{"required":{"id":"information obligatoire","secret":"information obligatoire"}}}},"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0","errorMessage":{"required":{"discovery":"information obligatoire","client":"information obligatoire"}}};
const obj0 = {"required":"missingProperty","dependencies":"property","dependentRequired":"property"};

function validate22(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="export0" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate22.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.discovery === undefined){
const err0 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "discovery"},message:"must have required property '"+"discovery"+"'",schema:schema37.required,parentSchema:schema37,data};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.client === undefined){
const err1 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "client"},message:"must have required property '"+"client"+"'",schema:schema37.required,parentSchema:schema37,data};
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
const err2 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema37.properties.type.type,parentSchema:schema37.properties.type,data:data0};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if("oidc" !== data0){
const err3 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "oidc"},message:"must be equal to constant",schema:"oidc",parentSchema:schema37.properties.type,data:data0};
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
const err5 = {instancePath:instancePath+"/discovery",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema37.properties.discovery.type,parentSchema:schema37.properties.discovery,data:data1};
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
const err7 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'",schema:schema37.properties.client.required,parentSchema:schema37.properties.client,data:data2};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data2.secret === undefined){
const err8 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "secret"},message:"must have required property '"+"secret"+"'",schema:schema37.properties.client.required,parentSchema:schema37.properties.client,data:data2};
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
const err9 = {instancePath:instancePath+"/client/id",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema37.properties.client.properties.id.type,parentSchema:schema37.properties.client.properties.id,data:data3};
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
const err11 = {instancePath:instancePath+"/client/secret",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema37.properties.client.properties.secret.type,parentSchema:schema37.properties.client.properties.secret,data:data4};
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
const err13 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema37.properties.client.type,parentSchema:schema37.properties.client,data:data2};
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
if((((((err14.keyword !== "errorMessage") && (!err14.emUsed)) && (err14.instancePath === instancePath+"/client")) && (err14.keyword in emErrors0)) && (err14.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client") === 0)) && (/^\/[^\/]*$/.test(err14.schemaPath.slice(108)))){
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
const err15 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors0},message:tmpl0 ? tmpl0() : schema37.properties.client.errorMessage[key0][keyProp0],schema:schema37.properties.client.errorMessage,parentSchema:schema37.properties.client,data:data2};
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
const err17 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema37.type,parentSchema:schema37,data};
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
if((((((err18.keyword !== "errorMessage") && (!err18.emUsed)) && (err18.instancePath === instancePath)) && (err18.keyword in emErrors1)) && (err18.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0") === 0)) && (/^\/[^\/]*$/.test(err18.schemaPath.slice(90)))){
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
const err19 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors1},message:tmpl1 ? tmpl1() : schema37.errorMessage[key1][keyProp1],schema:schema37.errorMessage,parentSchema:schema37,data};
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
validate22.errors = vErrors;
return errors === 0;
}
validate22.evaluated = {"props":{"type":true,"discovery":true,"client":true},"dynamicProps":false,"dynamicItems":false};

const schema38 = {"$id":"export1","$ref":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items"};
const schema39 = {"type":"object","required":["title","type"],"properties":{"title":{"type":"string","title":"Nom","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title","errorMessage":{}},"color":{"type":"string","title":"Couleur","x-display":"color-picket","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color","errorMessage":{}},"img":{"type":"string","title":"Lien vers logo (petite taille)","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img","errorMessage":{}}},"oneOf":[{"type":"object","title":"OpenID Connect","required":["discovery","client"],"properties":{"type":{"type":"string","title":"Type de founisseur","const":"oidc","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type","errorMessage":{}},"discovery":{"type":"string","title":"URL de découverte OICD","description":"probablement de la forme http://mon-fournisseur/.well-known/openid-configuration","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery","errorMessage":{}},"client":{"type":"object","required":["id","secret"],"properties":{"id":{"type":"string","title":"Identifiant du client","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id","errorMessage":{}},"secret":{"type":"string","title":"Secret","x-display":"textarea","writeOnly":true,"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client","errorMessage":{"required":{"id":"information obligatoire","secret":"information obligatoire"}}}},"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0","errorMessage":{"required":{"discovery":"information obligatoire","client":"information obligatoire"}}}],"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items","errorMessage":{"oneOf":"choisissez une valeur","required":{"title":"information obligatoire"}}};

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
const err0 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "discovery"},message:"must have required property '"+"discovery"+"'",schema:schema39.oneOf[0].required,parentSchema:schema39.oneOf[0],data};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.client === undefined){
const err1 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "client"},message:"must have required property '"+"client"+"'",schema:schema39.oneOf[0].required,parentSchema:schema39.oneOf[0],data};
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
const err2 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema39.oneOf[0].properties.type.type,parentSchema:schema39.oneOf[0].properties.type,data:data0};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if("oidc" !== data0){
const err3 = {instancePath:instancePath+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "oidc"},message:"must be equal to constant",schema:"oidc",parentSchema:schema39.oneOf[0].properties.type,data:data0};
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
const err5 = {instancePath:instancePath+"/discovery",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema39.oneOf[0].properties.discovery.type,parentSchema:schema39.oneOf[0].properties.discovery,data:data1};
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
const err7 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'",schema:schema39.oneOf[0].properties.client.required,parentSchema:schema39.oneOf[0].properties.client,data:data2};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data2.secret === undefined){
const err8 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "secret"},message:"must have required property '"+"secret"+"'",schema:schema39.oneOf[0].properties.client.required,parentSchema:schema39.oneOf[0].properties.client,data:data2};
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
const err9 = {instancePath:instancePath+"/client/id",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema39.oneOf[0].properties.client.properties.id.type,parentSchema:schema39.oneOf[0].properties.client.properties.id,data:data3};
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
const err11 = {instancePath:instancePath+"/client/secret",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema39.oneOf[0].properties.client.properties.secret.type,parentSchema:schema39.oneOf[0].properties.client.properties.secret,data:data4};
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
const err13 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema39.oneOf[0].properties.client.type,parentSchema:schema39.oneOf[0].properties.client,data:data2};
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
if((((((err14.keyword !== "errorMessage") && (!err14.emUsed)) && (err14.instancePath === instancePath+"/client")) && (err14.keyword in emErrors0)) && (err14.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client") === 0)) && (/^\/[^\/]*$/.test(err14.schemaPath.slice(108)))){
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
const err15 = {instancePath:instancePath+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors0},message:tmpl0 ? tmpl0() : schema39.oneOf[0].properties.client.errorMessage[key0][keyProp0],schema:schema39.oneOf[0].properties.client.errorMessage,parentSchema:schema39.oneOf[0].properties.client,data:data2};
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
const err17 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema39.oneOf[0].type,parentSchema:schema39.oneOf[0],data};
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
if((((((err18.keyword !== "errorMessage") && (!err18.emUsed)) && (err18.instancePath === instancePath)) && (err18.keyword in emErrors1)) && (err18.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0") === 0)) && (/^\/[^\/]*$/.test(err18.schemaPath.slice(90)))){
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
const err19 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors1},message:tmpl1 ? tmpl1() : schema39.oneOf[0].errorMessage[key1][keyProp1],schema:schema39.oneOf[0].errorMessage,parentSchema:schema39.oneOf[0],data};
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
const err21 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf",schema:schema39.oneOf,parentSchema:schema39,data};
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
const err22 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "title"},message:"must have required property '"+"title"+"'",schema:schema39.required,parentSchema:schema39,data};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data.type === undefined){
const err23 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'",schema:schema39.required,parentSchema:schema39,data};
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
const err24 = {instancePath:instancePath+"/title",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema39.properties.title.type,parentSchema:schema39.properties.title,data:data5};
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
const err26 = {instancePath:instancePath+"/color",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema39.properties.color.type,parentSchema:schema39.properties.color,data:data6};
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
const err28 = {instancePath:instancePath+"/img",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema39.properties.img.type,parentSchema:schema39.properties.img,data:data7};
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
const err30 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema39.type,parentSchema:schema39,data};
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
if((((((err31.keyword !== "errorMessage") && (!err31.emUsed)) && (err31.instancePath === instancePath)) && (err31.keyword in emErrors2)) && (err31.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err31.schemaPath.slice(82)))){
emErrors2[err31.keyword].push(err31);
err31.emUsed = true;
}
}
for(const key2 in emErrors2){
if(emErrors2[key2].length){
const err32 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emErrors2[key2]},message:key2 in templates2 ? templates2[key2]() : schema39.errorMessage[key2],schema:schema39.errorMessage,parentSchema:schema39,data};
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
if((((((err33.keyword !== "errorMessage") && (!err33.emUsed)) && (err33.instancePath === instancePath)) && (err33.keyword in emErrors3)) && (err33.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err33.schemaPath.slice(82)))){
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
const err34 = {instancePath,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors2},message:tmpl2 ? tmpl2() : schema39.errorMessage[key3][keyProp2],schema:schema39.errorMessage,parentSchema:schema39,data};
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

const schema40 = {"$id":"export2","$ref":"https://github.com/data-fair/simple-directory/site-patch#"};
const schema41 = {"$id":"https://github.com/data-fair/simple-directory/site-patch","x-exports":["types","validate","resolvedSchema","vjsf"],"title":"site-patch","type":"object","additionalProperties":false,"required":["_id","authMode"],"properties":{"_id":{"readOnly":true,"$ref":"https://github.com/data-fair/simple-directory/site#/properties/_id","__pointer":"https://github.com/data-fair/simple-directory/site-patch#/properties/_id","errorMessage":{}},"authMode":{"$ref":"https://github.com/data-fair/simple-directory/site#/properties/authMode","__pointer":"https://github.com/data-fair/simple-directory/site-patch#/properties/authMode","errorMessage":{"oneOf":"choisissez une valeur"}},"authProviders":{"$ref":"https://github.com/data-fair/simple-directory/site#/properties/authProviders","__pointer":"https://github.com/data-fair/simple-directory/site-patch#/properties/authProviders","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site-patch#","errorMessage":{"required":{"_id":"information obligatoire","authMode":"information obligatoire"}}};
const schema42 = {"type":"string","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/_id","errorMessage":{}};
const schema43 = {"default":"onlyBackOffice","title":"Mode d'authentification","type":"string","oneOf":[{"const":"onlyLocal","title":"uniquement sur le site lui même"},{"const":"onlyBackOffice","title":"uniquement sur le back-office"},{"const":"ssoBackOffice","title":"sur le site et sur le back-office par SSO"}],"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authMode","errorMessage":{"oneOf":"choisissez une valeur"}};
const schema44 = {"type":"array","title":"Fournisseurs d'identité (SSO)","items":{"type":"object","required":["title","type"],"properties":{"title":{"type":"string","title":"Nom","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title","errorMessage":{}},"color":{"type":"string","title":"Couleur","x-display":"color-picket","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color","errorMessage":{}},"img":{"type":"string","title":"Lien vers logo (petite taille)","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img","errorMessage":{}}},"oneOf":[{"type":"object","title":"OpenID Connect","required":["discovery","client"],"properties":{"type":{"type":"string","title":"Type de founisseur","const":"oidc","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type","errorMessage":{}},"discovery":{"type":"string","title":"URL de découverte OICD","description":"probablement de la forme http://mon-fournisseur/.well-known/openid-configuration","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery","errorMessage":{}},"client":{"type":"object","required":["id","secret"],"properties":{"id":{"type":"string","title":"Identifiant du client","__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id","errorMessage":{}},"secret":{"type":"string","title":"Secret","x-display":"textarea","writeOnly":true,"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret","errorMessage":{}}},"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client","errorMessage":{"required":{"id":"information obligatoire","secret":"information obligatoire"}}}},"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0","errorMessage":{"required":{"discovery":"information obligatoire","client":"information obligatoire"}}}],"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items","errorMessage":{"oneOf":"choisissez une valeur","required":{"title":"information obligatoire"}}},"__pointer":"https://github.com/data-fair/simple-directory/site#/properties/authProviders","errorMessage":{}};

function validate29(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://github.com/data-fair/simple-directory/site-patch" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate29.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data._id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "_id"},message:"must have required property '"+"_id"+"'",schema:schema41.required,parentSchema:schema41,data};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.authMode === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "authMode"},message:"must have required property '"+"authMode"+"'",schema:schema41.required,parentSchema:schema41,data};
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
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties",schema:false,parentSchema:schema41,data};
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
const err3 = {instancePath:instancePath+"/_id",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/_id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema42.type,parentSchema:schema42,data:data0};
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
if(errors > 0){
const emErrs1 = [];
for(const err5 of vErrors){
if(!err5.emUsed){
emErrs1.push(err5);
}
}
vErrors = emErrs1;
errors = emErrs1.length;
}
}
if(data.authMode !== undefined){
let data1 = data.authMode;
if(typeof data1 !== "string"){
const err6 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authMode/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema43.type,parentSchema:schema43,data:data1};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
const _errs8 = errors;
let valid3 = false;
let passing0 = null;
const _errs9 = errors;
if("onlyLocal" !== data1){
const err7 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authMode/oneOf/0/const",keyword:"const",params:{allowedValue: "onlyLocal"},message:"must be equal to constant",schema:"onlyLocal",parentSchema:schema43.oneOf[0],data:data1};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
var _valid0 = _errs9 === errors;
if(_valid0){
valid3 = true;
passing0 = 0;
}
const _errs10 = errors;
if("onlyBackOffice" !== data1){
const err8 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authMode/oneOf/1/const",keyword:"const",params:{allowedValue: "onlyBackOffice"},message:"must be equal to constant",schema:"onlyBackOffice",parentSchema:schema43.oneOf[1],data:data1};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid3){
valid3 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid3 = true;
passing0 = 1;
}
const _errs11 = errors;
if("ssoBackOffice" !== data1){
const err9 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authMode/oneOf/2/const",keyword:"const",params:{allowedValue: "ssoBackOffice"},message:"must be equal to constant",schema:"ssoBackOffice",parentSchema:schema43.oneOf[2],data:data1};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
var _valid0 = _errs11 === errors;
if(_valid0 && valid3){
valid3 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid3 = true;
passing0 = 2;
}
}
}
if(!valid3){
const err10 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authMode/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf",schema:schema43.oneOf,parentSchema:schema43,data:data1};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
else {
errors = _errs8;
if(vErrors !== null){
if(_errs8){
vErrors.length = _errs8;
}
else {
vErrors = null;
}
}
}
if(errors > 0){
const emErrors0 = {"oneOf":[]};
const templates0 = {};
for(const err11 of vErrors){
if((((((err11.keyword !== "errorMessage") && (!err11.emUsed)) && (err11.instancePath === instancePath+"/authMode")) && (err11.keyword in emErrors0)) && (err11.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authMode") === 0)) && (/^\/[^\/]*$/.test(err11.schemaPath.slice(71)))){
emErrors0[err11.keyword].push(err11);
err11.emUsed = true;
}
}
for(const key1 in emErrors0){
if(emErrors0[key1].length){
const err12 = {instancePath:instancePath+"/authMode",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authMode/errorMessage",keyword:"errorMessage",params:{errors: emErrors0[key1]},message:key1 in templates0 ? templates0[key1]() : schema43.errorMessage[key1],schema:schema43.errorMessage,parentSchema:schema43,data:data1};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
const emErrs2 = [];
for(const err13 of vErrors){
if(!err13.emUsed){
emErrs2.push(err13);
}
}
vErrors = emErrs2;
errors = emErrs2.length;
}
if(errors > 0){
const emErrors1 = {"oneOf":[]};
const templates1 = {};
for(const err14 of vErrors){
if((((((err14.keyword !== "errorMessage") && (!err14.emUsed)) && (err14.instancePath === instancePath+"/authMode")) && (err14.keyword in emErrors1)) && (err14.schemaPath.indexOf("#/properties/authMode") === 0)) && (/^\/[^\/]*$/.test(err14.schemaPath.slice(21)))){
emErrors1[err14.keyword].push(err14);
err14.emUsed = true;
}
}
for(const key2 in emErrors1){
if(emErrors1[key2].length){
const err15 = {instancePath:instancePath+"/authMode",schemaPath:"#/properties/authMode/errorMessage",keyword:"errorMessage",params:{errors: emErrors1[key2]},message:key2 in templates1 ? templates1[key2]() : schema41.properties.authMode.errorMessage[key2],schema:schema41.properties.authMode.errorMessage,parentSchema:schema41.properties.authMode,data:data1};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
const emErrs3 = [];
for(const err16 of vErrors){
if(!err16.emUsed){
emErrs3.push(err16);
}
}
vErrors = emErrs3;
errors = emErrs3.length;
}
}
if(data.authProviders !== undefined){
let data2 = data.authProviders;
if(Array.isArray(data2)){
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
let data3 = data2[i0];
const _errs17 = errors;
let valid7 = false;
let passing1 = null;
const _errs18 = errors;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.discovery === undefined){
const err17 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "discovery"},message:"must have required property '"+"discovery"+"'",schema:schema44.items.oneOf[0].required,parentSchema:schema44.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data3.client === undefined){
const err18 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/required",keyword:"required",params:{missingProperty: "client"},message:"must have required property '"+"client"+"'",schema:schema44.items.oneOf[0].required,parentSchema:schema44.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data3.type !== undefined){
let data4 = data3.type;
if(typeof data4 !== "string"){
const err19 = {instancePath:instancePath+"/authProviders/" + i0+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema44.items.oneOf[0].properties.type.type,parentSchema:schema44.items.oneOf[0].properties.type,data:data4};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if("oidc" !== data4){
const err20 = {instancePath:instancePath+"/authProviders/" + i0+"/type",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "oidc"},message:"must be equal to constant",schema:"oidc",parentSchema:schema44.items.oneOf[0].properties.type,data:data4};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(errors > 0){
const emErrs4 = [];
for(const err21 of vErrors){
if(!err21.emUsed){
emErrs4.push(err21);
}
}
vErrors = emErrs4;
errors = emErrs4.length;
}
}
if(data3.discovery !== undefined){
let data5 = data3.discovery;
if(typeof data5 !== "string"){
const err22 = {instancePath:instancePath+"/authProviders/" + i0+"/discovery",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema44.items.oneOf[0].properties.discovery.type,parentSchema:schema44.items.oneOf[0].properties.discovery,data:data5};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(errors > 0){
const emErrs5 = [];
for(const err23 of vErrors){
if(!err23.emUsed){
emErrs5.push(err23);
}
}
vErrors = emErrs5;
errors = emErrs5.length;
}
}
if(data3.client !== undefined){
let data6 = data3.client;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.id === undefined){
const err24 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'",schema:schema44.items.oneOf[0].properties.client.required,parentSchema:schema44.items.oneOf[0].properties.client,data:data6};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data6.secret === undefined){
const err25 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/required",keyword:"required",params:{missingProperty: "secret"},message:"must have required property '"+"secret"+"'",schema:schema44.items.oneOf[0].properties.client.required,parentSchema:schema44.items.oneOf[0].properties.client,data:data6};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data6.id !== undefined){
let data7 = data6.id;
if(typeof data7 !== "string"){
const err26 = {instancePath:instancePath+"/authProviders/" + i0+"/client/id",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema44.items.oneOf[0].properties.client.properties.id.type,parentSchema:schema44.items.oneOf[0].properties.client.properties.id,data:data7};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(errors > 0){
const emErrs6 = [];
for(const err27 of vErrors){
if(!err27.emUsed){
emErrs6.push(err27);
}
}
vErrors = emErrs6;
errors = emErrs6.length;
}
}
if(data6.secret !== undefined){
let data8 = data6.secret;
if(typeof data8 !== "string"){
const err28 = {instancePath:instancePath+"/authProviders/" + i0+"/client/secret",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema44.items.oneOf[0].properties.client.properties.secret.type,parentSchema:schema44.items.oneOf[0].properties.client.properties.secret,data:data8};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(errors > 0){
const emErrs7 = [];
for(const err29 of vErrors){
if(!err29.emUsed){
emErrs7.push(err29);
}
}
vErrors = emErrs7;
errors = emErrs7.length;
}
}
}
else {
const err30 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema44.items.oneOf[0].properties.client.type,parentSchema:schema44.items.oneOf[0].properties.client,data:data6};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(errors > 0){
const emErrors2 = {"required":{"id":[],"secret":[]}};
const templates2 = {required:{}};
let emPropParams0;
let emParamsErrors0;
for(const err31 of vErrors){
if((((((err31.keyword !== "errorMessage") && (!err31.emUsed)) && (err31.instancePath === instancePath+"/authProviders/" + i0+"/client")) && (err31.keyword in emErrors2)) && (err31.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client") === 0)) && (/^\/[^\/]*$/.test(err31.schemaPath.slice(108)))){
emPropParams0 = obj0[err31.keyword];
emParamsErrors0 = emErrors2[err31.keyword][err31.params[emPropParams0]];
if(emParamsErrors0){
emParamsErrors0.push(err31);
err31.emUsed = true;
}
}
}
for(const key3 in emErrors2){
for(const keyProp0 in emErrors2[key3]){
emParamsErrors0 = emErrors2[key3][keyProp0];
if(emParamsErrors0.length){
const tmpl0 = templates2[key3] && templates2[key3][keyProp0];
const err32 = {instancePath:instancePath+"/authProviders/" + i0+"/client",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors0},message:tmpl0 ? tmpl0() : schema44.items.oneOf[0].properties.client.errorMessage[key3][keyProp0],schema:schema44.items.oneOf[0].properties.client.errorMessage,parentSchema:schema44.items.oneOf[0].properties.client,data:data6};
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
const emErrs8 = [];
for(const err33 of vErrors){
if(!err33.emUsed){
emErrs8.push(err33);
}
}
vErrors = emErrs8;
errors = emErrs8.length;
}
}
}
else {
const err34 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema44.items.oneOf[0].type,parentSchema:schema44.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(errors > 0){
const emErrors3 = {"required":{"discovery":[],"client":[]}};
const templates3 = {required:{}};
let emPropParams1;
let emParamsErrors1;
for(const err35 of vErrors){
if((((((err35.keyword !== "errorMessage") && (!err35.emUsed)) && (err35.instancePath === instancePath+"/authProviders/" + i0)) && (err35.keyword in emErrors3)) && (err35.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0") === 0)) && (/^\/[^\/]*$/.test(err35.schemaPath.slice(90)))){
emPropParams1 = obj0[err35.keyword];
emParamsErrors1 = emErrors3[err35.keyword][err35.params[emPropParams1]];
if(emParamsErrors1){
emParamsErrors1.push(err35);
err35.emUsed = true;
}
}
}
for(const key4 in emErrors3){
for(const keyProp1 in emErrors3[key4]){
emParamsErrors1 = emErrors3[key4][keyProp1];
if(emParamsErrors1.length){
const tmpl1 = templates3[key4] && templates3[key4][keyProp1];
const err36 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors1},message:tmpl1 ? tmpl1() : schema44.items.oneOf[0].errorMessage[key4][keyProp1],schema:schema44.items.oneOf[0].errorMessage,parentSchema:schema44.items.oneOf[0],data:data3};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
}
const emErrs9 = [];
for(const err37 of vErrors){
if(!err37.emUsed){
emErrs9.push(err37);
}
}
vErrors = emErrs9;
errors = emErrs9.length;
}
var _valid1 = _errs18 === errors;
if(_valid1){
valid7 = true;
passing1 = 0;
var props0 = {};
props0.type = true;
props0.discovery = true;
props0.client = true;
}
if(!valid7){
const err38 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf",schema:schema44.items.oneOf,parentSchema:schema44.items,data:data3};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
else {
errors = _errs17;
if(vErrors !== null){
if(_errs17){
vErrors.length = _errs17;
}
else {
vErrors = null;
}
}
}
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.title === undefined){
const err39 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "title"},message:"must have required property '"+"title"+"'",schema:schema44.items.required,parentSchema:schema44.items,data:data3};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data3.type === undefined){
const err40 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'",schema:schema44.items.required,parentSchema:schema44.items,data:data3};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
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
const err41 = {instancePath:instancePath+"/authProviders/" + i0+"/title",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema44.items.properties.title.type,parentSchema:schema44.items.properties.title,data:data9};
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
if(data3.color !== undefined){
let data10 = data3.color;
if(typeof data10 !== "string"){
const err43 = {instancePath:instancePath+"/authProviders/" + i0+"/color",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema44.items.properties.color.type,parentSchema:schema44.items.properties.color,data:data10};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(errors > 0){
const emErrs11 = [];
for(const err44 of vErrors){
if(!err44.emUsed){
emErrs11.push(err44);
}
}
vErrors = emErrs11;
errors = emErrs11.length;
}
}
if(data3.img !== undefined){
let data11 = data3.img;
if(typeof data11 !== "string"){
const err45 = {instancePath:instancePath+"/authProviders/" + i0+"/img",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img/type",keyword:"type",params:{type: "string"},message:"must be string",schema:schema44.items.properties.img.type,parentSchema:schema44.items.properties.img,data:data11};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(errors > 0){
const emErrs12 = [];
for(const err46 of vErrors){
if(!err46.emUsed){
emErrs12.push(err46);
}
}
vErrors = emErrs12;
errors = emErrs12.length;
}
}
}
else {
const err47 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema44.items.type,parentSchema:schema44.items,data:data3};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(errors > 0){
const emErrors4 = {"oneOf":[]};
const templates4 = {};
for(const err48 of vErrors){
if((((((err48.keyword !== "errorMessage") && (!err48.emUsed)) && (err48.instancePath === instancePath+"/authProviders/" + i0)) && (err48.keyword in emErrors4)) && (err48.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err48.schemaPath.slice(82)))){
emErrors4[err48.keyword].push(err48);
err48.emUsed = true;
}
}
for(const key5 in emErrors4){
if(emErrors4[key5].length){
const err49 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emErrors4[key5]},message:key5 in templates4 ? templates4[key5]() : schema44.items.errorMessage[key5],schema:schema44.items.errorMessage,parentSchema:schema44.items,data:data3};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
const emErrors5 = {"required":{"title":[]}};
const templates5 = {required:{}};
let emPropParams2;
let emParamsErrors2;
for(const err50 of vErrors){
if((((((err50.keyword !== "errorMessage") && (!err50.emUsed)) && (err50.instancePath === instancePath+"/authProviders/" + i0)) && (err50.keyword in emErrors5)) && (err50.schemaPath.indexOf("https://github.com/data-fair/simple-directory/site#/properties/authProviders/items") === 0)) && (/^\/[^\/]*$/.test(err50.schemaPath.slice(82)))){
emPropParams2 = obj0[err50.keyword];
emParamsErrors2 = emErrors5[err50.keyword][err50.params[emPropParams2]];
if(emParamsErrors2){
emParamsErrors2.push(err50);
err50.emUsed = true;
}
}
}
for(const key6 in emErrors5){
for(const keyProp2 in emErrors5[key6]){
emParamsErrors2 = emErrors5[key6][keyProp2];
if(emParamsErrors2.length){
const tmpl2 = templates5[key6] && templates5[key6][keyProp2];
const err51 = {instancePath:instancePath+"/authProviders/" + i0,schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors2},message:tmpl2 ? tmpl2() : schema44.items.errorMessage[key6][keyProp2],schema:schema44.items.errorMessage,parentSchema:schema44.items,data:data3};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
const emErrs13 = [];
for(const err52 of vErrors){
if(!err52.emUsed){
emErrs13.push(err52);
}
}
vErrors = emErrs13;
errors = emErrs13.length;
}
}
}
else {
const err53 = {instancePath:instancePath+"/authProviders",schemaPath:"https://github.com/data-fair/simple-directory/site#/properties/authProviders/type",keyword:"type",params:{type: "array"},message:"must be array",schema:schema44.type,parentSchema:schema44,data:data2};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(errors > 0){
const emErrs14 = [];
for(const err54 of vErrors){
if(!err54.emUsed){
emErrs14.push(err54);
}
}
vErrors = emErrs14;
errors = emErrs14.length;
}
if(errors > 0){
const emErrs15 = [];
for(const err55 of vErrors){
if(!err55.emUsed){
emErrs15.push(err55);
}
}
vErrors = emErrs15;
errors = emErrs15.length;
}
}
}
else {
const err56 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object",schema:schema41.type,parentSchema:schema41,data};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(errors > 0){
const emErrors6 = {"required":{"_id":[],"authMode":[]}};
const templates6 = {required:{}};
let emPropParams3;
let emParamsErrors3;
for(const err57 of vErrors){
if((((((err57.keyword !== "errorMessage") && (!err57.emUsed)) && (err57.instancePath === instancePath)) && (err57.keyword in emErrors6)) && (err57.schemaPath.indexOf("#") === 0)) && (/^\/[^\/]*$/.test(err57.schemaPath.slice(1)))){
emPropParams3 = obj0[err57.keyword];
emParamsErrors3 = emErrors6[err57.keyword][err57.params[emPropParams3]];
if(emParamsErrors3){
emParamsErrors3.push(err57);
err57.emUsed = true;
}
}
}
for(const key7 in emErrors6){
for(const keyProp3 in emErrors6[key7]){
emParamsErrors3 = emErrors6[key7][keyProp3];
if(emParamsErrors3.length){
const tmpl3 = templates6[key7] && templates6[key7][keyProp3];
const err58 = {instancePath,schemaPath:"#/errorMessage",keyword:"errorMessage",params:{errors: emParamsErrors3},message:tmpl3 ? tmpl3() : schema41.errorMessage[key7][keyProp3],schema:schema41.errorMessage,parentSchema:schema41,data};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
}
const emErrs16 = [];
for(const err59 of vErrors){
if(!err59.emUsed){
emErrs16.push(err59);
}
}
vErrors = emErrs16;
errors = emErrs16.length;
}
validate29.errors = vErrors;
return errors === 0;
}
validate29.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


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
if(!(validate29(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
errors = vErrors.length;
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
  mainTree: "https://github.com/data-fair/simple-directory/site-patch#",

  skeletonTrees: {
    "https://github.com/data-fair/simple-directory/site-patch#": {
      title: "site-patch",
      root: "https://github.com/data-fair/simple-directory/site-patch#",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch#",
      discriminatorValue: undefined
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items": {
      title: "",
      root: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items",
      discriminatorValue: undefined
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0": {
      title: "OpenID Connect",
      root: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0",
      discriminatorValue: undefined
    }
  },

  skeletonNodes: {
    "https://github.com/data-fair/simple-directory/site-patch#": {
      title: "site-patch",
      key: "",
      pointer: "https://github.com/data-fair/simple-directory/site-patch#",
      refPointer: "https://github.com/data-fair/simple-directory/site-patch#",
      pure: true,
      propertyKeys: ["_id", "authMode", "authProviders"],
      roPropertyKeys: ["_id"],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site-patch#/properties/_id", "https://github.com/data-fair/simple-directory/site-patch#/properties/authMode", "https://github.com/data-fair/simple-directory/site-patch#/properties/authProviders"]
    },

    "https://github.com/data-fair/simple-directory/site-patch#/properties/_id": {
      title: undefined,
      key: "_id",
      pointer: "https://github.com/data-fair/simple-directory/site-patch#/properties/_id",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/_id",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch#/properties/authMode": {
      title: "Mode d'authentification",
      key: "authMode",
      pointer: "https://github.com/data-fair/simple-directory/site-patch#/properties/authMode",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authMode",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site-patch#/properties/authProviders": {
      title: "Fournisseurs d'identité (SSO)",
      key: "authProviders",
      pointer: "https://github.com/data-fair/simple-directory/site-patch#/properties/authProviders",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false,
      childrenTrees: ["https://github.com/data-fair/simple-directory/site#/properties/authProviders/items"]
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items": {
      title: undefined,
      key: "",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items",
      pure: true,
      propertyKeys: ["title", "color", "img", "type", "discovery", "client"],
      roPropertyKeys: [],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title", "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color", "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img", "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf"]
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title": {
      title: "Nom",
      key: "title",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color": {
      title: "Couleur",
      key: "color",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img": {
      title: "Lien vers logo (petite taille)",
      key: "img",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0": {
      key: "",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0",
      pure: true,
      propertyKeys: ["type", "discovery", "client"],
      roPropertyKeys: [],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type", "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery", "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client"]
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type": {
      title: "Type de founisseur",
      key: "type",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: false
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery": {
      title: "URL de découverte OICD",
      key: "discovery",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client": {
      title: undefined,
      key: "client",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client",
      pure: true,
      propertyKeys: ["id", "secret"],
      roPropertyKeys: [],
      nullable: false,
      required: true,
      children: ["https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id", "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret"]
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id": {
      title: "Identifiant du client",
      key: "id",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret": {
      title: "Secret",
      key: "secret",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret",
      pure: true,
      propertyKeys: [],
      roPropertyKeys: [],
      nullable: false,
      required: true
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf": {
      key: "$oneOf",
      pointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf",
      refPointer: "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf",
      childrenTrees: ["https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0"],
      discriminator: undefined,
      pure: true,
      propertyKeys: ["type", "discovery", "client"],
      roPropertyKeys: []
    }
  },

  normalizedLayouts: {
    "https://github.com/data-fair/simple-directory/site-patch#": {
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

    "https://github.com/data-fair/simple-directory/site-patch#/properties/_id": {
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

    "https://github.com/data-fair/simple-directory/site-patch#/properties/authMode": {
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

    "https://github.com/data-fair/simple-directory/site-patch#/properties/authProviders": {
      comp: "list",
      title: "Fournisseurs d'identité (SSO)",
      listEditMode: "inline-single",
      listActions: ["add", "edit", "delete", "sort", "duplicate"]
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items": {
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

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/title": {
      comp: "text-field",
      label: "Nom"
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/color": {
      comp: "text-field",
      label: "Couleur"
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/properties/img": {
      comp: "text-field",
      label: "Lien vers logo (petite taille)"
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf": {
      comp: "one-of-select",

      oneOfItems: [{
        key: 0,
        title: "OpenID Connect"
      }],

      defaultData: {},

      getDefaultData: {
        type: "js-eval",
        expr: "layout.defaultData",
        pure: true,
        dataAlias: "value",
        ref: 0
      }
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0": {
      comp: "section",

      children: [{
        key: "type"
      }, {
        key: "discovery"
      }, {
        key: "client"
      }],

      title: "OpenID Connect",
      defaultData: {},

      getDefaultData: {
        type: "js-eval",
        expr: "layout.defaultData",
        pure: true,
        dataAlias: "value",
        ref: 0
      }
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/type": {
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

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/discovery": {
      comp: "text-field",
      label: "URL de découverte OICD",
      help: "<p>probablement de la forme <a href=\"http://mon-fournisseur/.well-known/openid-configuration\">http://mon-fournisseur/.well-known/openid-configuration</a></p>"
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client": {
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

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/id": {
      comp: "text-field",
      label: "Identifiant du client"
    },

    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0/properties/client/properties/secret": {
      comp: "text-field",
      label: "Secret"
    }
  },

  validates: {
    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items/oneOf/0": validate22,
    "https://github.com/data-fair/simple-directory/site#/properties/authProviders/items": validate27,
    "https://github.com/data-fair/simple-directory/site-patch#": validate28
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
    copy: "Copier",
    paste: "Coller",
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
    none: {
      name: "none"
    },

    slot: {
      name: "slot"
    },

    "composite-slot": {
      name: "composite-slot",
      composite: true
    },

    section: {
      name: "section",
      composite: true
    },

    tabs: {
      name: "tabs",
      composite: true
    },

    "vertical-tabs": {
      name: "vertical-tabs",
      composite: true
    },

    "expansion-panels": {
      name: "expansion-panels",
      composite: true
    },

    stepper: {
      name: "stepper",
      composite: true
    },

    card: {
      name: "card",
      composite: true
    },

    list: {
      name: "list",
      itemsBased: true,

      schema: {
        required: ["listEditMode", "listActions"],

        properties: {
          title: {
            type: "string"
          },

          listEditMode: {
            type: "string",
            enum: ["inline", "inline-single", "menu", "dialog"]
          },

          listActions: {
            type: "array",

            items: {
              type: "string",
              enum: ["add", "edit", "delete", "sort", "duplicate", "copy", "paste"]
            }
          },

          clipboardKey: {
            type: "string"
          },

          itemTitle: {
            $ref: "https://json-layout.github.io/normalized-layout-keyword#/$defs/expression"
          },

          itemSubtitle: {
            $ref: "https://json-layout.github.io/normalized-layout-keyword#/$defs/expression"
          },

          itemCopy: {
            $ref: "https://json-layout.github.io/normalized-layout-keyword#/$defs/expression"
          },

          indexed: {
            type: "array",

            items: {
              type: "string"
            }
          },

          messages: {
            type: "object",
            additionalProperties: false,

            properties: {
              addItem: {
                type: "string"
              },

              delete: {
                type: "string"
              },

              edit: {
                type: "string"
              },

              duplicate: {
                type: "string"
              },

              sort: {
                type: "string"
              }
            }
          }
        }
      }
    },

    "text-field": {
      name: "text-field",
      shouldDebounce: true,
      focusable: true,
      emitsBlur: true,

      schema: {
        properties: {
          placeholder: {
            type: "string"
          }
        }
      }
    },

    textarea: {
      name: "textarea",
      shouldDebounce: true,
      focusable: true,
      emitsBlur: true,

      schema: {
        properties: {
          placeholder: {
            type: "string"
          },

          rows: {
            type: "number"
          }
        }
      }
    },

    "number-field": {
      name: "number-field",
      shouldDebounce: true,
      focusable: true,

      schema: {
        properties: {
          step: {
            type: "number"
          },

          min: {
            type: "number"
          },

          max: {
            type: "number"
          },

          precision: {
            type: "number"
          },

          placeholder: {
            type: "string"
          }
        }
      }
    },

    checkbox: {
      name: "checkbox"
    },

    switch: {
      name: "switch"
    },

    slider: {
      name: "slider",
      shouldDebounce: true,

      schema: {
        properties: {
          step: {
            type: "number"
          },

          min: {
            type: "number"
          },

          max: {
            type: "number"
          }
        }
      }
    },

    "date-picker": {
      name: "date-picker",

      schema: {
        properties: {
          min: {
            type: "string",
            format: "date"
          },

          max: {
            type: "string",
            format: "date"
          },

          format: {
            type: "string",
            enum: ["date", "date-time"],
            default: "date"
          }
        }
      }
    },

    "date-time-picker": {
      name: "date-time-picker",

      schema: {
        properties: {
          min: {
            type: "string",
            format: "date-time"
          },

          max: {
            type: "string",
            format: "date-time"
          }
        }
      }
    },

    "time-picker": {
      name: "time-picker",

      schema: {
        properties: {
          min: {
            type: "string",
            format: "time"
          },

          max: {
            type: "string",
            format: "time"
          }
        }
      }
    },

    "color-picker": {
      name: "color-picker",
      shouldDebounce: true
    },

    select: {
      name: "select",
      focusable: true,
      itemsBased: true,
      multipleCompat: true,

      schema: {
        properties: {
          placeholder: {
            type: "string"
          }
        }
      }
    },

    autocomplete: {
      name: "autocomplete",
      focusable: true,
      itemsBased: true,
      multipleCompat: true,

      schema: {
        properties: {
          placeholder: {
            type: "string"
          }
        }
      }
    },

    combobox: {
      name: "combobox",
      focusable: true,
      itemsBased: true,
      multipleCompat: true,

      schema: {
        properties: {
          placeholder: {
            type: "string"
          }
        }
      }
    },

    "number-combobox": {
      name: "number-combobox",
      focusable: true,
      itemsBased: true,
      multipleCompat: true,

      schema: {
        properties: {
          placeholder: {
            type: "string"
          },

          step: {
            type: "number"
          },

          min: {
            type: "number"
          },

          max: {
            type: "number"
          }
        }
      }
    },

    "checkbox-group": {
      name: "checkbox-group",
      itemsBased: true,
      multipleCompat: true
    },

    "switch-group": {
      name: "switch-group",
      itemsBased: true,
      multipleCompat: true
    },

    "radio-group": {
      name: "radio-group",
      itemsBased: true
    },

    "file-input": {
      name: "file-input",
      focusable: true,
      multipleCompat: true,
      isFileInput: true,

      schema: {
        properties: {
          accept: {
            type: "string"
          },

          placeholder: {
            type: "string"
          }
        }
      }
    },

    "one-of-select": {
      name: "one-of-select",

      schema: {
        required: ["oneOfItems"],

        properties: {
          emptyData: {
            type: "boolean"
          },

          oneOfItems: {
            type: "array",

            items: {
              $ref: "https://json-layout.github.io/normalized-layout-keyword#/$defs/one-of-item"
            }
          }
        }
      }
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