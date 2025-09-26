# ActBlue-Jail Development Workflow

**Project**: https://vercel.com/ryanmios-projects/act-blue-jail
**Production**: https://act-blue-jail.vercel.app (main branch)
**Development**: https://dev-act-blue-jail.vercel.app (dev branch)

## Workflow Commands

### Start New Feature
```bash
git checkout dev && git pull
git checkout -b feature/feature-name
# Develop feature...
git add . && git commit -m "Description"
git push origin feature/feature-name
```
**Preview URL**: https://feature-feature-name-act-blue-jail.vercel.app

### Merge to Dev
```bash
git checkout dev
git merge feature/feature-name
git push origin dev
```
**Dev URL**: https://dev-act-blue-jail.vercel.app

### Deploy to Production
```bash
git checkout main
git merge dev
git push origin main
```
**Production URL**: https://act-blue-jail.vercel.app

## Environment Setup
- Copy `env.example` to `.env.local`
- Configure environment variables in Vercel dashboard for production/preview
- Use development Supabase project for dev/preview environments

## Testing
- Test locally: `npm run dev`
- Preview deployments auto-create on branch push
- Run `npm run lint` before commits
