import React from 'react';
import { MapPin, Clock, Leaf, Package, ArrowRight } from 'lucide-react';

export default function DonationCard({ donation, onSelect }) {
  const minutes = Math.ceil((new Date(donation.pickupDeadline).getTime() - Date.now()) / 60000);
  const urgent = donation.status === 'OPEN' && minutes > 0 && minutes < 180;
  const remaining = minutes <= 0 ? 'Pickup window ended' : minutes < 60 ? `${minutes}m remaining` : `${Math.floor(minutes / 60)}h ${minutes % 60}m remaining`;
  
  const status = { 
    OPEN: 'Available', 
    CLAIMED: 'Reserved', 
    COMPLETED: 'Collected', 
    EXPIRED: 'Expired', 
    CANCELLED: 'Cancelled' 
  };
  
  const food = { 
    VEGETARIAN: 'Vegetarian', 
    NON_VEGETARIAN: 'Non-vegetarian', 
    OTHER: 'Packaged / Other' 
  };
  
  const FoodIcon = donation.foodType === 'VEGETARIAN' ? Leaf : Package;

  return (
    <article className="donation-card">
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Badges row */}
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50/80 text-emerald-800 border border-emerald-200/60 backdrop-blur-sm">
              <FoodIcon size={14} aria-hidden="true" />
              {food[donation.foodType] || 'Other'}
            </span>
            <span className={`status-pill ${donation.status === 'OPEN' ? 'status-open' : ''}`}>
              {status[donation.status] || donation.status}
            </span>
          </div>

          {/* Quantity */}
          <p className="mb-2 flex items-baseline gap-1.5">
            <strong className="text-3xl font-extrabold tracking-tight text-emerald-950">
              {donation.quantity}
            </strong>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {donation.unit}
            </span>
          </p>

          {/* Title & Description */}
          <h3 className="text-lg font-bold leading-snug mb-2 text-slate-900 line-clamp-1 break-words">
            {donation.title}
          </h3>
          <p className="text-xs leading-relaxed text-slate-600 line-clamp-2 mb-4">
            {donation.description}
          </p>
        </div>

        {/* Location & Organization */}
        <div className="pt-2 border-t border-slate-100/80">
          <p className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
            {donation.donorOrganization?.name || 'Donor organization'}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />
            <span className="line-clamp-1">{donation.donorOrganization?.locality || 'See pickup details'}</span>
          </p>
        </div>
      </div>

      {/* Expiry Ribbon */}
      <div className={`pickup-note ${urgent ? 'pickup-urgent' : ''}`}>
        <Clock size={15} className="shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium">
          {donation.status === 'OPEN' ? remaining : `Pickup deadline: ${new Date(donation.pickupDeadline).toLocaleDateString()}`}
        </span>
      </div>

      {/* Action CTA */}
      <button 
        className="card-action" 
        onClick={() => onSelect(donation.id)} 
        aria-label={`View pickup details for ${donation.title}`}
      >
        <span>View pickup details</span>
        <ArrowRight size={16} className="text-emerald-700" aria-hidden="true" />
      </button>
    </article>
  );
}
