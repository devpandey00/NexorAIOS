'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.leadService = exports.LeadService = void 0;
var database_1 = require('@nexor/database');
var LeadService = /** @class */ (function () {
  function LeadService() {}
  LeadService.prototype.create = function (data) {
    return database_1.leadRepository.create(data);
  };
  LeadService.prototype.findAll = function (filters) {
    if (filters === void 0) {
      filters = {};
    }
    return database_1.leadRepository.findMany(filters);
  };
  LeadService.prototype.findById = function (id) {
    return database_1.leadRepository.findById(id);
  };
  LeadService.prototype.update = function (id, data) {
    return database_1.leadRepository.update(id, data);
  };
  LeadService.prototype.delete = function (id) {
    return database_1.leadRepository.delete(id);
  };
  return LeadService;
})();
exports.LeadService = LeadService;
exports.leadService = new LeadService();
