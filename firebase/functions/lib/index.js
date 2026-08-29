"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserAudit = exports.onPpeDeliveryAudit = exports.onInventoryMovementAudit = exports.onPpeItemAudit = exports.onEmployeeAudit = exports.recalcularAlertasAgendada = exports.recalcularAlertasCallable = exports.registrarDevolucao = exports.registrarEntrega = exports.registrarEntrada = exports.criarColaborador = exports.onEmployeeStatusChanged = exports.onUserProfileWritten = exports.onAuthUserCreate = void 0;
var onAuthUserCreate_1 = require("./auth/onAuthUserCreate");
Object.defineProperty(exports, "onAuthUserCreate", { enumerable: true, get: function () { return onAuthUserCreate_1.onAuthUserCreate; } });
var onUserProfileWritten_1 = require("./auth/onUserProfileWritten");
Object.defineProperty(exports, "onUserProfileWritten", { enumerable: true, get: function () { return onUserProfileWritten_1.onUserProfileWritten; } });
var onEmployeeStatusChanged_1 = require("./employees/onEmployeeStatusChanged");
Object.defineProperty(exports, "onEmployeeStatusChanged", { enumerable: true, get: function () { return onEmployeeStatusChanged_1.onEmployeeStatusChanged; } });
var criarColaborador_1 = require("./employees/criarColaborador");
Object.defineProperty(exports, "criarColaborador", { enumerable: true, get: function () { return criarColaborador_1.criarColaborador; } });
var registrarEntrada_1 = require("./inventory/registrarEntrada");
Object.defineProperty(exports, "registrarEntrada", { enumerable: true, get: function () { return registrarEntrada_1.registrarEntrada; } });
var registrarEntrega_1 = require("./deliveries/registrarEntrega");
Object.defineProperty(exports, "registrarEntrega", { enumerable: true, get: function () { return registrarEntrega_1.registrarEntrega; } });
var registrarDevolucao_1 = require("./returns/registrarDevolucao");
Object.defineProperty(exports, "registrarDevolucao", { enumerable: true, get: function () { return registrarDevolucao_1.registrarDevolucao; } });
var recalcularAlertas_1 = require("./alerts/recalcularAlertas");
Object.defineProperty(exports, "recalcularAlertasCallable", { enumerable: true, get: function () { return recalcularAlertas_1.recalcularAlertasCallable; } });
Object.defineProperty(exports, "recalcularAlertasAgendada", { enumerable: true, get: function () { return recalcularAlertas_1.recalcularAlertasAgendada; } });
// Triggers de auditoria (equivalentes aos 5 triggers trg_audit_* do Postgres)
const makeAuditTrigger_1 = require("./audit/makeAuditTrigger");
exports.onEmployeeAudit = (0, makeAuditTrigger_1.makeAuditTrigger)('employees', 'employees');
exports.onPpeItemAudit = (0, makeAuditTrigger_1.makeAuditTrigger)('ppeItems', 'ppeItems');
exports.onInventoryMovementAudit = (0, makeAuditTrigger_1.makeAuditTrigger)('inventoryMovements', 'inventoryMovements');
exports.onPpeDeliveryAudit = (0, makeAuditTrigger_1.makeAuditTrigger)('ppeDeliveries', 'ppeDeliveries');
exports.onUserAudit = (0, makeAuditTrigger_1.makeAuditTrigger)('users', 'users');
//# sourceMappingURL=index.js.map