import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, BookOpen, Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const difficultyLabels = {
  easy: { label: "Kolay", color: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Orta", color: "bg-amber-100 text-amber-700" },
  hard: { label: "Zor", color: "bg-rose-100 text-rose-700" }
};

export default function TestPackageCard({ test, onBuy, isPurchased, isCompleted, isInProgress = false, showEducator = true }) {
  const difficulty = difficultyLabels[test.difficulty] || difficultyLabels.medium;

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
      <Link to={createPageUrl("TestDetail") + `?id=${test.id}`}>
        <div className="relative h-40 overflow-hidden cursor-pointer" style={{backgroundColor: '#0000CD'}}>
          {test.cover_image ?
          <img src={test.cover_image} alt={test.title} className="w-full h-full object-cover" /> :

        <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-white/30" />
          </div>
        }
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/90 text-slate-700 backdrop-blur-sm">
            {test.exam_type_name || "Genel"}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          <Badge className="bg-white/90 text-slate-700 backdrop-blur-sm">
            {difficulty.label}{test.has_solutions ? " - Çözümlü" : ""}
          </Badge>
        </div>
        </div>
      </Link>

      <div className="p-5">
        <Link to={createPageUrl("TestDetail") + `?id=${test.id}`}>
          <h3 className="font-semibold text-lg text-slate-900 line-clamp-2 transition-colors cursor-pointer" style={{color: 'inherit'}} onMouseEnter={(e) => e.currentTarget.style.color = '#0000CD'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
            {test.title}
          </h3>
        </Link>
        
        {showEducator && test.educator_name &&
        <Link
          to={createPageUrl("EducatorProfile") + `?email=${encodeURIComponent(test.educator_email)}`}
          className="flex items-center gap-2 mt-2 text-sm text-slate-500 transition-colors w-fit" style={{color: 'inherit'}} onMouseEnter={(e) => e.currentTarget.style.color = '#0000CD'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
          onClick={(e) => e.stopPropagation()}>

            <User className="w-4 h-4" />
            <span>{test.educator_name}</span>
          </Link>
        }

        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 flex-wrap">
          {test.test_count > 0 &&
          <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{test.test_count} Test</span>
            </div>
          }
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{test.question_count || 0} Soru</span>
          </div>
          {test.duration_minutes &&
          <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{test.duration_minutes} dk</span>
            </div>
          }
          {test.average_rating > 0 &&
          <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{test.average_rating.toFixed(1)}</span>
            </div>
          }
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
          <div>
            {test.campaign_price && test.campaign_price > 0 && test.campaign_price < test.price ?
            <div>
                <span className="text-2xl font-bold text-slate-900">₺{test.campaign_price}</span>
                <span className="text-sm text-slate-400 line-through ml-2">₺{test.price}</span>
              </div> :

            <div className="text-2xl font-bold text-slate-900">
                {test.price === 0 ? "Ücretsiz" : `₺${test.price}`}
              </div>
            }
          </div>
          {isPurchased ?
          <Link to={createPageUrl("TestDetail") + `?id=${test.id}`}>
              <Button size="sm" style={{backgroundColor: '#10b981'}} className="hover:opacity-90">
                Teste Başla
              </Button>
            </Link> :

          <Button
            onClick={() => onBuy?.(test)}
            style={{backgroundColor: '#0000CD'}}
            className="hover:opacity-90">

              Satın Al
            </Button>
          }
        </div>
      </div>
    </div>);

}