import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCreator } from '../data/catalog';
import { date, Empty, EstimateNote, money, PageHeading, percent, ProductImage, Status } from '../components/ui';
import { useMerchant } from '../state/MerchantContext';

export function Drafts() {
  const { drafts, ideas } = useMerchant();
  return <>
    <PageHeading eyebrow="YOUR NEXT COLLECTION, TAKING SHAPE" title="My Product Drafts" description="Community designs, prepared for your store. All products are saved as drafts." action={<Link className="button secondary" to="/applications">My Applications <ArrowRight size={16} /></Link>} />
    <div className="notice"><CheckCircle2 size={19} /><div><strong>Your demo drafts stay in this browser.</strong><p>These are mock Shopify products. No products have been created or published in a real store.</p></div></div>
    {drafts.length ? <div className="draft-list">{drafts.map(draft => (
      <article id={draft.id} className="saved-draft panel" key={draft.id}>
        <ProductImage src={draft.images[0]} alt={draft.title} />
        <div className="saved-draft-content">
          <div className="section-heading"><span className="mini-label">{ideas.find(idea => idea.id === draft.ideaId)?.title}</span><Status status="draft" /></div>
          <h2>{draft.title}</h2>
          <p className="muted draft-description">{draft.description}</p>
          <div className="draft-values">
            <div><span className="mini-label">Selling price</span><strong>{money(draft.pricing.sellingPrice)}</strong></div>
            <div><span className="mini-label">Arcade cost estimate</span><strong>{money(draft.pricing.manufacturingCost)}</strong></div>
            <div><span className="mini-label">Creator commission ({percent(draft.pricing.creatorCommissionRate)})</span><strong>{money(draft.pricing.creatorCommissionAmount)}</strong></div>
            <div><span className="mini-label">Estimated Profit Before Other Expenses</span><strong className={draft.pricing.merchantEstimatedProfit < 0 ? 'profit-negative' : ''}>{money(draft.pricing.merchantEstimatedProfit)} <small>({draft.pricing.merchantEstimatedProfitMargin.toFixed(1)}%)</small></strong></div>
            <div><span className="mini-label">Created</span><span>{date(draft.createdAt)}</span></div>
          </div>
          {draft.pricing.demoOverride && <p className="demo-scenario-note">Demo scenario: approved Match commission remains {percent(draft.commissionTerms.commissionRate)}. Adjusted values are estimates only.</p>}
          <div className="draft-ids">
            <span>Branch <Link to={`/branches/${draft.branchId}`}><code>{draft.branchId}</code></Link></span>
            <span>Match <code>{draft.applicationId}</code> · Commission recipient: {getCreator(draft.commissionTerms.commissionRecipientId)?.name ?? draft.commissionTerms.commissionRecipientId} · Approved terms: {percent(draft.commissionTerms.commissionRate)}</span>
            <span>Mock Shopify Product ID <code>{draft.shopifyProductId}</code></span>
          </div>
          <EstimateNote />
        </div>
      </article>
    ))}</div> : <Empty title="A new collection starts with one idea" action={<Link className="button primary" to="/">Discover ideas <ArrowRight size={16} /></Link>}>Once a creator approves your application, prepare a product draft and find it here.</Empty>}
  </>;
}
