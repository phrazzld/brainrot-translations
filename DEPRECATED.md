# ⚠️ REPOSITORY DEPRECATED - MOVED TO MONOREPO ⚠️

## This repository has been archived and is no longer maintained.

### 📦 The translations have been migrated to a monorepo structure

**New Repository:** https://github.com/phrazzld/brainrot

### What Changed?

All translations are now part of a unified monorepo at `content/translations/books/`:
- **Better Organization**: Each book has its own directory with metadata
- **Unified Pipeline**: Integrated with web app and publishing tools
- **Format Generation**: Automatic conversion to EPUB, PDF, and Kindle formats
- **Version Control**: Single repository for all content and code

### Current Books in Monorepo

All translations have been migrated and organized:
- `great-gatsby/` - The Great Gatsby 
- `the-iliad/` - The Iliad
- `the-odyssey/` - The Odyssey
- `the-aeneid/` - The Aeneid
- `alice-in-wonderland/` - Alice's Adventures in Wonderland
- `frankenstein/` - Frankenstein
- `declaration-of-independence/` - Declaration of Independence
- `simple-sabotage-field-manual/` - Simple Sabotage Field Manual
- `la-divina-comedia/` - The Divine Comedy
- `tao-te-ching/` - Tao Te Ching

### For Contributors

To add or edit translations:

```bash
# Clone the new monorepo
git clone https://github.com/phrazzld/brainrot.git
cd brainrot

# Navigate to translations
cd content/translations/books/

# Generate formats after editing
pnpm generate:formats [book-name]

# Sync to blob storage
pnpm sync:blob [book-name]
```

### Migration Benefits

- ✅ Integrated with web application
- ✅ Automated publishing pipeline
- ✅ Shared formatting templates
- ✅ Unified CI/CD for all content
- ✅ Better collaboration tools

### Migration Date

**Archived**: August 20, 2025  
**Git History**: Fully preserved in monorepo via subtree merge  
**Migration Commit**: [View in Monorepo](https://github.com/phrazzld/brainrot/commits/master)

### Questions?

Please open issues in the new repository: https://github.com/phrazzld/brainrot/issues

---

*This repository is kept for historical reference only. All translation work continues in the monorepo.*