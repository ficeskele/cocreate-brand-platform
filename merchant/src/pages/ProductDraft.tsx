import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileBox, FlaskConical, LockKeyhole } from 'lucide-react';
import { getCreator, merchant } from '../data/catalog';
import { Back, Empty, ErrorNotice, EstimateNote, Gallery, money, PageHeading, percent, Status } from '../components/ui';
import { calculateProfit } from '../services/pricing';
import { useMerchant } from '../state/MerchantContext';
import type { Branch, Idea, MatchApplication } from '../types';

export function ProductDraft() {
  const { id } = useParams();
  const { applications, drafts, branches, ideas } = useMerchant();
  const app = applications.find(item => item.id === id);
  const branch = branches.find(item => item.id === app?.branchId);
  const idea = ideas.find(item => item.id === branch?.ideaId);

  if (!app || app.status !== 'approved' || !branch || !idea) {
    return <>
      <Back to="/applications">My Applications</Back>
      <div className="locked-state">
        <LockKeyhole size={34} />
        <h1>Creator approval comes first</h1>
        <p>You need an approved application for this branch to prepare a product draft.</p>
        <Link className="button primary" to="/applications">View My Applications</Link>
      </div>
    </>;
  }
  const existing = drafts.find(draft => draft.applicationId === app.id);
  if (existing) return <>
    <Back to="/applications">My Applications</Back>
    <Empty title="Your product draft is ready" action={<Link className="button primary" to={`/drafts#${existing.id}`}>View My Product Drafts <ArrowRight size={16} /></Link>}>
      “{existing.title}” has already been saved as a mock Shopify product draft.
    </Empty>
  </>;
  return <DraftForm key={app.id} app={app} branch={branch} idea={idea} />;
}

function DraftForm({ app, branch, idea }: { app: MatchApplication; branch: Branch; idea: Idea }) {
  const { service, refresh } = useMerchant();
  const [title, setTitle] = useState(`${idea.title} — ${branch.name}`);
  const [description, setDescription] = useState(branch.description);
  const [price, setPrice] = useState((branch.estimatedManufacturingCost * 2.5).toFixed(2));
  const [manufacturingCost, setManufacturingCost] = useState(branch.estimatedManufacturingCost.toFixed(2));
  const [commissionPercent, setCommissionPercent] = useState(String(app.commissionTerms.commissionRate * 100));
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const validPrice = price.trim() !== '' && Number.isFinite(Number(price)) && Number(price) > 0;
  const validCost = manufacturingCost.trim() !== '' && Number.isFinite(Number(manufacturingCost)) && Number(manufacturingCost) >= 0;
  const validRate = commissionPercent.trim() !== '' && Number.isFinite(Number(commissionPercent)) && Number(commissionPercent) >= 0 && Number(commissionPercent) <= 100;
  const validEstimate = validPrice && validCost && validRate;
  const pricing = calculateProfit(Number(price), Number(manufacturingCost), Number(commissionPercent) / 100);
  const grossMargin = pricing.sellingPrice - pricing.manufacturingCost;
  const scenarioChanged = demoMode && (Number(manufacturingCost) !== branch.estimatedManufacturingCost || Number(commissionPercent) / 100 !== app.commissionTerms.commissionRate);

  const toggleDemo = (enabled: boolean) => {
    setDemoMode(enabled);
    if (!enabled) {
      setManufacturingCost(branch.estimatedManufacturingCost.toFixed(2));
      setCommissionPercent(String(app.commissionTerms.commissionRate * 100));
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await service.createProductDraft(merchant.id, {
        applicationId: app.id, title, description, sellingPrice: Number(price),
        demoOverride: demoMode,
        ...(demoMode ? { manufacturingCost: Number(manufacturingCost), creatorCommissionRate: Number(commissionPercent) / 100 } : {}),
      });
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create your draft. Try again.');
    } finally { setBusy(false); }
  };

  return <>
    <Back to="/applications">My Applications</Back>
    <PageHeading eyebrow="FROM COMMUNITY IDEA TO YOUR COLLECTION" title="Prepare Product Draft" description="Review the approved creator terms and estimate your potential profit." action={<Status status="draft" />} />
    <div className="notice success"><CheckCircle2 size={19} />Application approved for {branch.name}. Proposed creator commission: {percent(app.commissionTerms.commissionRate)}.</div>
    <form onSubmit={event => void submit(event)}>
      <div className="draft-grid">
        <div className="form-stack">
          <section className="panel">
            <h2>Product details</h2>
            <label className="field">Product title <span className="required">Required</span><input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
            <label className="field">Description <span className="required">Required</span><textarea required maxLength={5000} rows={6} value={description} onChange={event => setDescription(event.target.value)} /></label>
          </section>
          <section className="panel">
            <div className="section-heading"><h2>Product media</h2><span className="muted text-xs">2 concept illustrations</span></div>
            <Gallery images={branch.images} name={branch.name} />
          </section>
          <section className="panel">
            <h2>Product origin</h2>
            <dl className="origin-list">
              <dt>Original idea</dt><dd><Link to={`/ideas/${idea.id}`}>{idea.title}</Link></dd>
              <dt>Idea creator</dt><dd>{getCreator(idea.creatorId).name}</dd>
              <dt>Design branch</dt><dd><Link to={`/branches/${branch.id}`}>{branch.name}</Link></dd>
              <dt>Branch ID</dt><dd><code>{branch.id}</code></dd>
              <dt>Commission recipient</dt><dd>{getCreator(app.commissionTerms.commissionRecipientId)?.name ?? app.commissionTerms.commissionRecipientId}</dd>
              <dt>Match ID</dt><dd><code>{app.id}</code></dd>
              <dt>Store</dt><dd>{merchant.storeName} (demo)</dd>
            </dl>
          </section>
        </div>
        <div className="draft-sidebar">
          <section className="panel pricing-panel" aria-labelledby="profit-title">
            <h2 id="profit-title">Pricing &amp; Profit Estimate</h2>
            <p className="pricing-intro">The {percent(app.commissionTerms.commissionRate)} creator commission is part of this approved demo Match. Changing your selling price keeps that rate unchanged.</p>
            <label className="field">Selling price (USD) <span className="required">Required</span>
              <div className="price-input"><span>$</span><input aria-label="Selling price (USD)" required type="number" min="0.01" max="1000000" step="0.01" value={price} onChange={event => setPrice(event.target.value)} /></div>
            </label>
            <div className="profit-breakdown" aria-live="polite">
              <div><span>Selling price</span><strong>{validPrice ? money(pricing.sellingPrice) : '—'}</strong></div>
              <div><span>Arcade manufacturing cost <small>estimate</small></span><strong>{validCost ? `−${money(pricing.manufacturingCost)}` : '—'}</strong></div>
              <div className="profit-subtotal"><span>Gross margin before commission</span><strong>{validPrice && validCost ? money(grossMargin) : '—'}</strong></div>
              <div><span>Creator commission ({validRate ? percent(pricing.creatorCommissionRate) : '—'})</span><strong>{validPrice && validRate ? `−${money(pricing.creatorCommissionAmount)}` : '—'}</strong></div>
            </div>
            <div className={`margin-card ${validEstimate && pricing.merchantEstimatedProfit < 0 ? 'negative' : ''}`} aria-live="polite">
              <span>Estimated Profit Before Other Expenses</span>
              <strong>{validEstimate ? money(pricing.merchantEstimatedProfit) : '—'}<small>{validEstimate ? `${pricing.merchantEstimatedProfitMargin.toFixed(1)}%` : '—'}</small></strong>
              <span>Estimated merchant margin per unit</span>
            </div>
            {validEstimate && pricing.merchantEstimatedProfit < 0 && <p className="loss-note" role="status">Estimated profit is negative at this selling price.</p>}
            <div className="pricing-demo">
              <label className="demo-toggle"><input type="checkbox" checked={demoMode} onChange={event => toggleDemo(event.target.checked)} /><FlaskConical size={16} />Demo Controls <span>Adjust estimates</span></label>
              {demoMode && <div className="pricing-demo-fields">
                <label className="field">Arcade manufacturing cost estimate (USD)
                  <div className="price-input"><span>$</span><input aria-label="Arcade manufacturing cost estimate (USD)" required type="number" min="0" max="1000000" step="0.01" value={manufacturingCost} onChange={event => setManufacturingCost(event.target.value)} /></div>
                </label>
                <label className="field">Creator commission rate (%)
                  <div className="price-input"><input aria-label="Creator commission rate (%)" required type="number" min="0" max="100" step="0.1" value={commissionPercent} onChange={event => setCommissionPercent(event.target.value)} /><span>%</span></div>
                </label>
                <p className="demo-scenario-note">Demo scenario only. The approved Match terms stay at {percent(app.commissionTerms.commissionRate)}{scenarioChanged ? '; this draft will save the scenario separately.' : '.'}</p>
              </div>}
            </div>
            <EstimateNote />
          </section>
          <section className="panel">
            <h2>Ready when you are</h2>
            <div className="price-row"><span>Product status</span><Status status="draft" /></div>
            <p className="muted text-sm">This creates a mock draft saved in your browser. Nothing is published to a live Shopify store.</p>
            {error && <ErrorNotice>{error}</ErrorNotice>}
            <button type="submit" className="button primary full" disabled={busy}><FileBox size={16} />{busy ? 'Creating draft…' : 'Create Product Draft'}</button>
          </section>
        </div>
      </div>
    </form>
  </>;
}
