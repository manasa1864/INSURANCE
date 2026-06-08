import React, { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Shield, Eye, EyeOff, Camera, User, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { TermsModal } from "../components/TermsModal";

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSignup = searchParams.get("mode") === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile picture state
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePfpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }

    setPfpFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPfpPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePfp = () => {
    setPfpFile(null);
    setPfpPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadPfp = async (userId: string): Promise<string | null> => {
    if (!pfpFile) return null;

    const fileExt = pfpFile.name.split(".").pop();
    const filePath = `avatars/${userId}.${fileExt}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, pfpFile, { upsert: true });

    if (error) {
      console.error("Avatar upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.endsWith("@gmail.com")) {
      alert("Only Gmail addresses (@gmail.com) are accepted.");
      return;
    }

    if (isSignup && !agreed) {
      alert("Please agree to the Terms & Conditions");
      return;
    }

    setLoading(true);

    if (isSignup) {
      // SIGN UP
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        alert(error.message);
      } else {
        // Upload avatar if provided
        if (pfpFile && data.user) {
          const avatarUrl = await uploadPfp(data.user.id);
          if (avatarUrl) {
            // Update user metadata with avatar URL
            await supabase.auth.updateUser({
              data: { avatar_url: avatarUrl },
            });
          }
        }
        alert("Signup successful! Please log in.");
        navigate("/auth?mode=login");
      }
    } else {
      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
      } else {
        navigate("/dashboard");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="bg-[#1E64FF] p-3 rounded-xl shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
          {isSignup ? "Create your account" : "Sign in to your account"}
        </h2>

        <button
          onClick={() =>
            navigate(isSignup ? "/auth?mode=login" : "/auth?mode=signup")
          }
          className="mt-2 text-sm text-[#1E64FF]"
        >
          {isSignup ? "Already have an account? Sign in" : "New user? Sign up"}
        </button>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Profile Picture Upload — signup only */}
            {isSignup && (
              <div className="flex flex-col items-center gap-2">
                <label className="block text-sm font-medium text-slate-700 self-start">
                  Profile Picture <span className="text-slate-400 font-normal">(optional)</span>
                </label>

                <div className="relative group">
                  {/* Avatar preview / placeholder */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#1E64FF] hover:bg-blue-50 transition-colors"
                  >
                    {pfpPreview ? (
                      <img
                        src={pfpPreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <User size={28} />
                        <span className="text-xs">Upload</span>
                      </div>
                    )}
                  </div>

                  {/* Camera badge */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-[#1E64FF] text-white rounded-full p-1.5 shadow-md hover:bg-blue-700 transition-colors"
                  >
                    <Camera size={14} />
                  </button>

                  {/* Remove button */}
                  {pfpPreview && (
                    <button
                      type="button"
                      onClick={removePfp}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400">JPG, PNG, GIF · Max 5MB</p>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePfpChange}
                  className="hidden"
                />
              </div>
            )}

            {isSignup && (
              <div>
                <label className="block text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-sm text-[#1E64FF] underline"
                >
                  Agree to Terms & Conditions
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E64FF] text-white py-3 rounded-xl font-semibold"
            >
              {loading ? "Please wait..." : isSignup ? "Sign up" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => {
          setAgreed(true);
          setShowTerms(false);
        }}
      />
    </div>
  );
};