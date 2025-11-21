# AB Jail Development Workflow

**Project**: https://vercel.com/ryanmios-projects (see the AB Jail project)
**Production**: https://abjail.org (main branch)
**Development**: http://localhost:3000 (run Next.js locally on the `dev` branch)

## Workflow Commands

### Start New Feature
```bash
git checkout dev && git pull
git checkout -b feature/feature-name
# Develop feature...
git add . && git commit -m "Description"
git push origin feature/feature-name
```
**Preview URL**: Vercel automatically creates a unique preview URL for each branch / pull request (visible in the PR checks and Vercel dashboard).

### Merge to Dev
```bash
git checkout dev
git merge feature/feature-name
git push origin dev
```
**Dev URL**: Typically `http://localhost:3000` while running `npm run dev` on the `dev` branch. You can also use the Vercel preview URL for the `dev` branch if configured.

### Deploy to Production
```bash
git checkout main
git merge dev
git push origin main
```
**Production URL**: https://abjail.org