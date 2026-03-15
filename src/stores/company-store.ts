import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type { Company, CompanyPermission, CreateCompanyRequest, CreateCompanyResponse } from "@/types";

interface CompanyState {
  companies: Company[];
  selectedCompanyId: string | null;
  isLoading: boolean;

  fetchCompanies: () => Promise<void>;
  createCompany: (req: CreateCompanyRequest) => Promise<CreateCompanyResponse>;
  selectCompany: (id: string) => void;
  selectedCompany: () => Company | undefined;
  hasPermission: (permission: CompanyPermission) => boolean;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      companies: [],
      selectedCompanyId: null,
      isLoading: false,

      fetchCompanies: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get<Company[]>("/companies");
          set({ companies: data });
          // Auto-select first company if none selected
          if (!get().selectedCompanyId && data.length > 0) {
            set({ selectedCompanyId: data[0].id });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      createCompany: async (req) => {
        const { data } = await api.post<CreateCompanyResponse>("/companies", req);
        await get().fetchCompanies();
        set({ selectedCompanyId: data.id });
        return data;
      },

      selectCompany: (id) => set({ selectedCompanyId: id }),

      selectedCompany: () => {
        const { companies, selectedCompanyId } = get();
        return companies.find((c) => c.id === selectedCompanyId);
      },

      hasPermission: (permission: CompanyPermission) => {
        const { companies, selectedCompanyId } = get();
        const company = companies.find((c) => c.id === selectedCompanyId);
        if (!company) return false;
        return company.permissions?.includes(permission) ?? false;
      },
    }),
    {
      name: "yoollive-company",
      partialize: (state) => ({
        selectedCompanyId: state.selectedCompanyId,
      }),
    }
  )
);
