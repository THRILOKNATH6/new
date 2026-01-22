const MasterRepo = require('../../repositories/it/masterRepo');

class MasterService {

    // --- Style ---
    async createStyle(id, name, brand) {
        if (!id || !name) throw new Error("Style ID and Name are required");

        const exists = await MasterRepo.checkStyleExists(id);
        if (exists) throw new Error(`Style ID '${id}' already exists`);

        return await MasterRepo.createStyle(id, name, brand);
    }

    async getStyles() {
        return await MasterRepo.getAllStyles();
    }

    // --- Age Group ---
    async createAgeGroup(name, age) {
        if (!name) throw new Error("Name is required");

        const existing = await MasterRepo.getAgeGroupByName(name);
        if (existing) throw new Error(`Age Group '${name}' already exists`);

        const maxId = await MasterRepo.getMaxId('age_groups', 'age_group_id');
        return await MasterRepo.createAgeGroup(maxId + 1, name, age);
    }

    async getAgeGroups() {
        return await MasterRepo.getAllAgeGroups();
    }

    // --- Category ---
    async createCategory(name) {
        if (!name) throw new Error("Name is required");

        const existing = await MasterRepo.getCategoryByName(name);
        if (existing) throw new Error(`Category '${name}' already exists`);

        const maxId = await MasterRepo.getMaxId('categorys', 'category_id');
        return await MasterRepo.createCategory(maxId + 1, name);
    }

    async getCategories() {
        return await MasterRepo.getAllCategories();
    }

    // --- Size Category ---
    async createSizeCategory(name, sizes) {
        if (!name || !sizes) throw new Error("Name and Sizes (CSV) are required");

        const existing = await MasterRepo.getSizeCategoryByName(name);
        if (existing) throw new Error(`Size Category '${name}' already exists`);

        const maxId = await MasterRepo.getMaxId('size_categorys', 'size_category_id');
        return await MasterRepo.createSizeCategory(maxId + 1, name, sizes);
    }

    async getSizeCategories() {
        return await MasterRepo.getAllSizeCategories();
    }

    async appendSizesToCategory(id, sizes) {
        if (!id || !sizes) throw new Error("ID and Sizes are required");

        // Parse CSV
        const sizeList = sizes.split(',').map(s => s.trim()).filter(s => s);
        if (sizeList.length === 0) throw new Error("At least one size is required");

        return await MasterRepo.addSizesToCategory(id, sizeList);
    }

    // --- Colour ---
    async createColor(styleId, name, code) {
        if (!styleId || !name) throw new Error("Style ID and Name are required");

        const colorCode = code || Math.floor(100 + Math.random() * 900).toString();

        const existing = await MasterRepo.getColorByName(styleId, name);
        if (existing) return existing;

        return await MasterRepo.createColor(styleId, colorCode, name);
    }

    async getColors(styleId) {
        if (!styleId) return [];
        return await MasterRepo.getColorsByStyle(styleId);
    }
}

module.exports = new MasterService();
