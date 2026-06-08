import React from 'react';
import { 
  Heart, User, Car, Plane, Home, Briefcase, 
  Activity, Stethoscope, GraduationCap, Sprout, Smartphone, Dog 
} from 'lucide-react';
import clsx from 'clsx';

const insuranceTypes = [
  { id: 'health', name: 'Health', icon: Heart },
  { id: 'life', name: 'Life', icon: User },
  { id: 'vehicle', name: 'Vehicle', icon: Car },
  { id: 'travel', name: 'Travel', icon: Plane },
  { id: 'home', name: 'Home', icon: Home },
  { id: 'business', name: 'Business', icon: Briefcase },
  { id: 'accident', name: 'Accident', icon: Activity },
  { id: 'critical', name: 'Critical', icon: Stethoscope },
  { id: 'education', name: 'Education', icon: GraduationCap },
  { id: 'crop', name: 'Crop', icon: Sprout },
  { id: 'gadget', name: 'Gadget', icon: Smartphone },
  { id: 'pet', name: 'Pet', icon: Dog },
];

interface Step1Props {
  selectedType: string | null;
  onSelect: (type: string) => void;
}

export const Step1_TypeSelection: React.FC<Step1Props> = ({ selectedType, onSelect }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">What do you want to protect?</h2>
        <p className="text-slate-500">Select the type of insurance you are looking for.</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {insuranceTypes.map((type) => {
          const isSelected = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={clsx(
                "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200",
                isSelected 
                  ? "border-[#1E64FF] bg-blue-50 text-[#1E64FF] shadow-md transform scale-105" 
                  : "border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50"
              )}
            >
              <type.icon className={clsx("w-8 h-8 mb-3", isSelected ? "text-[#1E64FF]" : "text-slate-400")} />
              <span className="font-semibold text-sm">{type.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
