import { Pencil, Plus, Trash2 } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { SellerDialog } from "./seller-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { SelectNative } from "./ui/select-native";
import { CustomTooltip } from "./ui/tooltip";

export const SELLERS_LOCAL_STORAGE_KEY = "TULKIT_INVOICE_PDF_SELLERS";

// Type for seller management
export interface Seller {
  id: string;
  name: string;
  address: string;
  email: string;
  vatNo?: string;
  accountNumber?: string;
  swiftBic?: string;
  notes?: string;
  vatNoFieldIsVisible?: boolean;
  accountNumberFieldIsVisible?: boolean;
  swiftBicFieldIsVisible?: boolean;
  notesFieldIsVisible?: boolean;
}

// Default seller data
const DEFAULT_SELLER: Seller = {
  id: "default-seller",
  name: "",
  address: "",
  email: "",
  vatNo: "",
  accountNumber: "",
  swiftBic: "",
  notes: "",
  vatNoFieldIsVisible: true,
  accountNumberFieldIsVisible: true,
  swiftBicFieldIsVisible: false,
  notesFieldIsVisible: false,
};

interface SellerManagementProps {
  sellers: Seller[];
  setSellers: Dispatch<SetStateAction<Seller[]>>;
  selectedSellerId: string;
  setSelectedSellerId: (id: string) => void;
  onSellerSelect: (seller: Seller) => void;
}

export function SellerManagement({
  sellers,
  setSellers,
  selectedSellerId,
  setSelectedSellerId,
  onSellerSelect,
}: SellerManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  // Initialize with default seller if none exist
  useEffect(() => {
    if (sellers.length === 0) {
      setSellers([DEFAULT_SELLER]);
      setSelectedSellerId(DEFAULT_SELLER.id);
    }
  }, [sellers, setSellers, setSelectedSellerId]);

  const handleAddSeller = (newSeller: Seller) => {
    setSellers((prev) => {
      const updated = [...prev, newSeller];
      setSelectedSellerId(newSeller.id);
      onSellerSelect(newSeller);
      return updated;
    });
    setIsDialogOpen(false);
  };

  const handleEditSeller = (updatedSeller: Seller) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === updatedSeller.id ? updatedSeller : s)),
    );
    setIsDialogOpen(false);
    setEditingSeller(null);
  };

  const handleDeleteSeller = (id: string) => {
    setSellers((prev) => {
      let updated = prev.filter((s) => s.id !== id);
      if (updated.length === 0) {
        updated = [DEFAULT_SELLER];
        setSelectedSellerId(DEFAULT_SELLER.id);
        onSellerSelect(DEFAULT_SELLER);
      } else if (id === selectedSellerId) {
        const newSelected = updated[0];
        setSelectedSellerId(newSelected.id);
        onSellerSelect(newSelected);
      }
      return updated;
    });
  };

  const handleSellerChange = (id: string) => {
    const seller = sellers.find((s) => s.id === id);
    if (seller) {
      setSelectedSellerId(id);
      onSellerSelect(seller);
    }
  };

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);

  return (
    <div className="mb-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="sellerSelect">Select Seller</Label>
          <SelectNative
            id="sellerSelect"
            value={selectedSellerId}
            onChange={(e) => handleSellerChange(e.target.value)}
            className="mt-1 w-full"
          >
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name || "Unnamed Seller"}
              </option>
            ))}
          </SelectNative>
        </div>

        <div className="flex gap-2">
          <CustomTooltip
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSeller(selectedSeller || null);
                  setIsDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            }
            content="Edit seller details"
          />

          <CustomTooltip
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSeller(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            }
            content="Add new seller"
          />
        </div>
      </div>

      {selectedSeller && sellers.length > 1 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-fit"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Seller
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                seller information.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteSeller(selectedSeller.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <SellerDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setEditingSeller(null);
          }
        }}
        onSave={editingSeller ? handleEditSeller : handleAddSeller}
        seller={editingSeller || undefined}
      />
    </div>
  );
}
