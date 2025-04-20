"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const errorMessage = err.errors.map(e => e.message).join(', ');
                return next(new Error(`Validation failed: ${errorMessage}`));
            }
            next(err);
        }
    };
};
exports.validate = validate;
