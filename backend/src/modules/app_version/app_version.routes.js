const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({
    latest_version: process.env.APP_LATEST_VERSION || '1.0.0',
    build_number: parseInt(process.env.APP_LATEST_BUILD || '1'),
    download_url: process.env.APP_DOWNLOAD_URL || '',
    force_update: process.env.APP_FORCE_UPDATE === 'true',
    release_notes: process.env.APP_RELEASE_NOTES || 'Bug fixes and improvements.',
  });
});

module.exports = router;
