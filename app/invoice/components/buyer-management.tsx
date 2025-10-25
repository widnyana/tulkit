import { Pencil, Plus, Trash2 } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { BuyerDialog } from "./buyer-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { SelectNative } from "./ui/select-native";
import { CustomTooltip } from "./ui/tooltip";

export const BUYERS_LOCAL_STORAGE_KEY = "TULKIT_INVOICE_PDF_BUYERS";

// Type for buyer management
export interface Buyer {
  id: string;
  name: string;
  address: string;
  email: string;
  vatNo?: string;
  notes?: string;
  vatNoFieldIsVisible?: boolean;
  notesFieldIsVisible?: boolean;
}

// Default buyer data
const DEFAULT_BUYER: Buyer = {
  id: "default-buyer",
  name: "",
  address: "",
  email: "",
  vatNo: "",
  notes: "",
  vatNoFieldIsVisible: true,
  notesFieldIsVisible: false,
};

interface BuyerManagementProps {
  buyers: Buyer[];
  setBuyers: Dispatch<SetStateAction<Buyer[]>>;
  selectedBuyerId: string;
  setSelectedBuyerId: (id: string) => void;
  onBuyerSelect: (buyer: Buyer) => void;
}

export function BuyerManagement({
  buyers,
  setBuyers,
  selectedBuyerId,
  setSelectedBuyerId,
  onBuyerSelect,
}: BuyerManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);

  // Initialize with default buyer if none exist
  useEffect(() => {
    if (buyers.length === 0) {
      setBuyers([DEFAULT_BUYER]);
      setSelectedBuyerId(DEFAULT_BUYER.id);
    }
  }, [buyers, setBuyers, setSelectedBuyerId]);

  const handleAddBuyer = (newBuyer: Buyer) => {
    setBuyers((prev) => {
      const updated = [...prev, newBuyer];
      setSelectedBuyerId(newBuyer.id);
      onBuyerSelect(newBuyer);
      return updated;
    });
    setIsDialogOpen(false);
  };

  const handleEditBuyer = (updatedBuyer: Buyer) => {
    setBuyers((prev) =>
      prev.map((b) => (b.id === updatedBuyer.id ? updatedBuyer : b)),
    );
    setIsDialogOpen(false);
    setEditingBuyer(null);
  };

  const handleDeleteBuyer = (id: string) => {
    setBuyers((prev) => {
      let updated = prev.filter((b) => b.id !== id);
      if (updated.length === 0) {
        updated = [DEFAULT_BUYER];
        setSelectedBuyerId(DEFAULT_BUYER.id);
        onBuyerSelect(DEFAULT_BUYER);
      } else if (id === selectedBuyerId) {
        const newSelected = updated[0];
        setSelectedBuyerId(newSelected.id);
        onBuyerSelect(newSelected);
      }
      return updated;
    });
  };

  const handleBuyerChange = (id: string) => {
    const buyer = buyers.find((b) => b.id === id);
    if (buyer) {
      setSelectedBuyerId(id);
      onBuyerSelect(buyer);
    }
  };

  const selectedBuyer = buyers.find((b) => b.id === selectedBuyerId);

  return (
    <div className="mb-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buyerSelect">Select Buyer</Label>
          <SelectNative
            id="buyerSelect"
            value={selectedBuyerId}
            onChange={(e) => handleBuyerChange(e.target.value)}
            className="mt-1 w-full"
          >
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name || "Unnamed Buyer"}
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
                  setEditingBuyer(selectedBuyer || null);
                  setIsDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            }
            content="Edit buyer details"
          />

          <CustomTooltip
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingBuyer(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            }
            content="Add new buyer"
          />
        </div>
      </div>

      {selectedBuyer && buyers.length > 1 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-fit"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Buyer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                buyer information.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteBuyer(selectedBuyer.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <BuyerDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setEditingBuyer(null);
          }
        }}
        onSave={editingBuyer ? handleEditBuyer : handleAddBuyer}
        buyer={editingBuyer || undefined}
      />
    </div>
  );
}
