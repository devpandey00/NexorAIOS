'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createWhatsAppLink = createWhatsAppLink;
function createWhatsAppLink(phone, message) {
  var cleanPhone = phone.replace(/\D/g, '');
  var encodedMessage = encodeURIComponent(message);
  return 'https://wa.me/'.concat(cleanPhone, '?text=').concat(encodedMessage);
}
