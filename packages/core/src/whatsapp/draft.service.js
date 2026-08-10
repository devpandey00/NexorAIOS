'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.whatsappDraftService = exports.WhatsAppDraftService = void 0;
var personalizer_js_1 = require('./personalizer.js');
var WhatsAppDraftService = /** @class */ (function () {
  function WhatsAppDraftService() {}
  WhatsAppDraftService.prototype.createPrompt = function (input) {
    return (0, personalizer_js_1.buildWhatsAppPrompt)(input);
  };
  WhatsAppDraftService.prototype.createDraft = function (input) {
    return {
      prompt: this.createPrompt(input),
    };
  };
  return WhatsAppDraftService;
})();
exports.WhatsAppDraftService = WhatsAppDraftService;
exports.whatsappDraftService = new WhatsAppDraftService();
