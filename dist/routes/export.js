"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_1 = require("../controllers/export");
const validate_1 = require("../middlewares/validate");
const export_2 = require("../validation/export");
const exportRouter = (0, express_1.Router)();
// exportRouter.get(
//   '/',
//   protect,
//   allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
//   validate(exportAttendanceSchema),
//   exportAttendance
// );
exportRouter.get('/', (0, validate_1.validate)(export_2.exportAttendanceSchema), export_1.exportAttendance);
exports.default = exportRouter;
