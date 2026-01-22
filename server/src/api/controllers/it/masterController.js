const MasterService = require('../../../services/it/masterService');

class MasterController {

    async createStyle(req, res) {
        try {
            const { id, name, brand } = req.body;
            const result = await MasterService.createStyle(id, name, brand);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getStyles(req, res) {
        try {
            const data = await MasterService.getStyles();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async createAgeGroup(req, res) {
        try {
            const { name, age } = req.body;
            const result = await MasterService.createAgeGroup(name, age);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getAgeGroups(req, res) {
        try {
            const data = await MasterService.getAgeGroups();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async createCategory(req, res) {
        try {
            const result = await MasterService.createCategory(req.body.name);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getCategories(req, res) {
        try {
            const data = await MasterService.getCategories();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async createSizeCategory(req, res) {
        try {
            const { name, sizes } = req.body;
            const result = await MasterService.createSizeCategory(name, sizes);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getSizeCategories(req, res) {
        try {
            const data = await MasterService.getSizeCategories();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async appendSizesToCategory(req, res) {
        try {
            const { id } = req.params;
            const { sizes } = req.body;
            const result = await MasterService.appendSizesToCategory(id, sizes);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async createColor(req, res) {
        try {
            const { styleId, name, code } = req.body;
            const result = await MasterService.createColor(styleId, name, code);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getColors(req, res) {
        try {
            const { styleId } = req.query;
            const data = await MasterService.getColors(styleId);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = new MasterController();
