# RustPlusPlus Home Assistant Add-on Deployment Guide

This guide explains how to deploy the RustPlusPlus Home Assistant add-on to your own GitHub repository and make it available for installation on Home Assistant Green.

## Overview

The add-on has been created with the following structure:
```
homeassistant-addon/
├── .github/workflows/builder.yaml    # Automated building
├── .gitignore                        # Git ignore rules
├── build.yaml                        # Build configuration
├── config.yaml                       # Add-on configuration
├── Dockerfile                        # Container definition
├── README.md                         # Add-on documentation
├── INSTALLATION_GUIDE.md             # User installation guide
├── DEPLOYMENT_GUIDE.md               # This file
├── repository.yaml                   # Repository metadata
├── run.sh                           # Startup script
├── package.json                     # Node.js dependencies
├── package-lock.json                # Dependency lock file
├── index.ts                         # Main application file
├── config/                          # Configuration files
├── src/                             # Source code
└── [other RustPlusPlus files]
```

## Step 1: Create GitHub Repository

1. **Create a New Repository**
   - Go to GitHub and create a new repository
   - Name it something like `rustplusplus-homeassistant-addon`
   - Make it public (required for Home Assistant add-on repositories)

2. **Upload the Add-on Files**
   - Upload all files from the `homeassistant-addon/` directory to your repository
   - Ensure the directory structure is maintained

3. **Update Repository Information**
   - Edit `repository.yaml` and replace:
     - `YOUR_USERNAME` with your GitHub username
     - `your.email@example.com` with your email
   - Edit `README.md` and update the repository URL references

## Step 2: Configure GitHub Actions

The included GitHub Actions workflow will automatically build the add-on for all supported architectures when you push changes.

1. **Enable GitHub Actions**
   - Go to your repository's "Actions" tab
   - Enable workflows if prompted

2. **Set Up Container Registry**
   - The workflow uses GitHub Container Registry (ghcr.io)
   - No additional setup required - it uses your GitHub token automatically

## Step 3: Test the Build

1. **Push Initial Commit**
   - Push all files to your repository
   - This will trigger the first build

2. **Check Build Status**
   - Go to the "Actions" tab in your repository
   - Verify that the build completes successfully for all architectures

3. **Fix Any Issues**
   - If builds fail, check the logs and fix any issues
   - Common issues include missing dependencies or configuration errors

## Step 4: Make Repository Available

1. **Create a Release (Optional)**
   - Go to "Releases" in your repository
   - Create a new release with version tag (e.g., `v1.22.0`)
   - This helps users track versions

2. **Update Documentation**
   - Ensure all documentation references the correct repository URL
   - Test the installation instructions yourself if possible

## Step 5: Distribution

### Option A: Direct Repository Addition
Users can add your repository directly to Home Assistant:
1. Supervisor → Add-on Store → ⋮ → Repositories
2. Add: `https://github.com/YOUR_USERNAME/rustplusplus-homeassistant-addon`

### Option B: Community Add-ons (Advanced)
For wider distribution, consider submitting to community add-on repositories:
- [Home Assistant Community Add-ons](https://github.com/hassio-addons)
- Follow their contribution guidelines

## Maintenance

### Updating RustPlusPlus Version
When RustPlusPlus releases updates:

1. **Update Source Files**
   - Replace the source files with new versions
   - Update `package.json` version number
   - Update `config.yaml` version

2. **Test Changes**
   - Test the updated add-on locally if possible
   - Ensure all features still work

3. **Release Update**
   - Commit and push changes
   - Create a new release tag
   - Update documentation if needed

### Monitoring
- Watch the original RustPlusPlus repository for updates
- Monitor GitHub Issues for user problems
- Keep dependencies updated for security

## Troubleshooting

### Build Failures
- Check GitHub Actions logs for specific errors
- Verify all required files are present
- Ensure Dockerfile syntax is correct

### Installation Issues
- Test the installation process yourself
- Check Home Assistant logs for errors
- Verify repository URL is accessible

### Runtime Problems
- Check add-on logs in Home Assistant
- Verify configuration options are correct
- Test with minimal configuration first

## Security Considerations

1. **Secrets Management**
   - Never commit Discord tokens or credentials to the repository
   - Use Home Assistant's configuration system for sensitive data

2. **Dependencies**
   - Regularly update Node.js dependencies
   - Monitor for security vulnerabilities

3. **Container Security**
   - Keep base images updated
   - Follow Docker security best practices

## Support

For support with the add-on:
1. Check the original RustPlusPlus documentation
2. Review Home Assistant add-on development docs
3. Create issues in your repository for add-on specific problems

## License

This add-on is based on RustPlusPlus by alexemanuelol, which is licensed under GPL-3.0. Ensure you comply with the license terms when distributing.

---

**Next Steps for Users:**
After deploying this add-on, users should follow the `INSTALLATION_GUIDE.md` to install and configure it on their Home Assistant Green systems.