/*! Webex JS SDK v2.59.1 */
var __awaiter=this&&this.__awaiter||function(e,t,a,n){return new(a||(a=Promise))((function(r,o){function s(e){try{u(n.next(e))}catch(e){o(e)}}function i(e){try{u(n.throw(e))}catch(e){o(e)}}function u(e){var t;e.done?r(e.value):(t=e.value,t instanceof a?t:new a((function(e){e(t)}))).then(s,i)}u((n=n.apply(e,t||[])).next())}))};import{LocalGenerator}from"../generator";let generator,busy=!1;addEventListener("message",(e=>__awaiter(void 0,void 0,void 0,(function*(){if(e.data.image){if(busy||!generator||!generator.isLoaded())return;busy=!0;const t=yield generator.getMask(e.data.image);t.warm&&postMessage({mask:t.data}),setTimeout((()=>{busy=!1}),0)}else{if(!e.data.input||!e.data.mask)throw console.error(e.data),new Error("[ladon-ts] - worker generator - unknown message:");{const t=e.data;generator=new LocalGenerator(t),yield generator.load(),postMessage({status:"success"})}}}))));