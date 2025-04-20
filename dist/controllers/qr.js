"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRCode = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const uuid_1 = require("uuid");
const code_1 = require("../models/code");
const section_1 = require("../models/section");
const config_1 = __importDefault(require("../config/config"));
const logger_1 = __importDefault(require("../utils/logger"));
const node_cron_1 = __importDefault(require("node-cron"));
const asyncHandler_1 = require("../utils/asyncHandler");
exports.generateQRCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, sectionNumber, location } = req.body;
    const section = await section_1.Section.create({
        classId,
        date: new Date(),
        sectionNumber,
        status: 'active',
    });
    const uniqueCode = (0, uuid_1.v4)();
    const expiresAt = new Date(Date.now() + config_1.default.QR_CODE_EXPIRY_MINUTES * 60 * 1000);
    const code = await code_1.Code.create({
        code: uniqueCode,
        expiresAt,
        location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
            name: location.name || config_1.default.DEFAULT_UNIVERSITY_LOCATION.name,
            radius: location.radius || config_1.default.LOCATION_RADIUS,
        },
        classId,
        sectionId: section._id,
        createdBy: req.user.id,
        isActive: true,
    });
    const qrImage = await qrcode_1.default.toDataURL(`http://localhost:3000/api/attendance/verify/${uniqueCode}`);
    res.json({ message: 'QR Code generated', qrImage, sectionId: section._id, codeId: code._id });
});
node_cron_1.default.schedule('* * * * *', async () => {
    try {
        const activeSections = await section_1.Section.find({ status: 'active' });
        for (const section of activeSections) {
            const oldCode = await code_1.Code.findOne({ sectionId: section._id, isActive: true });
            if (oldCode) {
                oldCode.isActive = false;
                await oldCode.save();
            }
            const uniqueCode = (0, uuid_1.v4)();
            const expiresAt = new Date(Date.now() + config_1.default.QR_CODE_EXPIRY_MINUTES * 60 * 1000);
            await code_1.Code.create({
                code: uniqueCode,
                expiresAt,
                location: oldCode?.location || config_1.default.DEFAULT_UNIVERSITY_LOCATION,
                classId: section.classId,
                sectionId: section._id,
                createdBy: oldCode?.createdBy,
                isActive: true,
            });
            logger_1.default.info(`New QR code generated for section ${section._id}`);
        }
    }
    catch (error) {
        logger_1.default.error(`QR regeneration failed: ${error.message}`);
    }
});
