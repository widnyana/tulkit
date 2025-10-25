import {
  type InvoiceData,
  type SellerData,
  sellerSchema,
} from "@/app/invoice/schema";
import { isLocalStorageAvailable } from "@/lib/check-local-storage";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useId,
  useState,
} from "react";
import type { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DEFAULT_SELLER_DATA } from "../constants";
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
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { SelectNative } from "./ui/select-native";
import { CustomTooltip } from "./ui/tooltip";

export const SELLERS_LOCAL_STORAGE_KEY = "TULKIT_INVOICE_PDF_SELLERS";

interface SellerManagementProps {
  setValue: UseFormSetValue<InvoiceData>;
  invoiceData: InvoiceData;
  selectedSellerId: string;
  setSelectedSellerId: Dispatch<SetStateAction<string>>;
  formValues?: Partial<SellerData>;
}

export function SellerManagement({
  setValue,
  invoiceData,
  selectedSellerId,
  setSelectedSellerId,
  formValues,
}: SellerManagementProps) {
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [sellersSelectOptions, setSellersSelectOptions] = useState<
    SellerData[]
  >([]);
  // const [selectedSellerIndex, setSelectedSellerIndex] = useState("");
  const [editingSeller, setEditingSeller] = useState<SellerData | null>(null);

  const sellerSelectId = useId();

  const isEditMode = Boolean(editingSeller);

  // Load sellers from localStorage on component mount
  useEffect(() => {
    try {
      const savedSellers = localStorage.getItem(SELLERS_LOCAL_STORAGE_KEY);
      const parsedSellers: unknown = savedSellers
        ? JSON.parse(savedSellers)
        : [];

      // Validate sellers array with Zod
      const sellersSchema = z.array(sellerSchema);
      const validationResult = sellersSchema.safeParse(parsedSellers);

      if (!validationResult.success) {
        console.error("Invalid sellers data:", validationResult.error);
        return;
      }

      const selectedSeller = validationResult.data.find(
        (seller: SellerData) => {
          return seller?.id === invoiceData?.seller?.id;
        },
      );

      setSellersSelectOptions(validationResult.data);
      setSelectedSellerId(selectedSeller?.id ?? "");
    } catch (error) {
      console.error("Failed to load sellers:", error);
    }
  }, [invoiceData?.seller?.id, setSelectedSellerId]);

  // Update sellers when a new one is added
  const handleSellerAdd = (
    newSeller: SellerData,
    {
      shouldApplyNewSellerToInvoice,
    }: { shouldApplyNewSellerToInvoice: boolean },
  ) => {
    try {
      const newSellerWithId = {
        ...newSeller,
        // Generate a unique ID for the new seller (IMPORTANT!) =)
        id: Date.now().toString(),
      };

      const newSellers = [...sellersSelectOptions, newSellerWithId];

      // Save to localStorage
      localStorage.setItem(
        SELLERS_LOCAL_STORAGE_KEY,
        JSON.stringify(newSellers),
      );

      // Update the sellers state
      setSellersSelectOptions(newSellers);

      // Apply the new seller to the invoice if the user wants to, otherwise just add it to the list and use it later if needed
      if (shouldApplyNewSellerToInvoice) {
        setValue("seller", newSellerWithId);
        setSelectedSellerId(newSellerWithId?.id);
      }

      toast.success("Seller added successfully", {
        richColors: true,
      });
    } catch (error) {
      console.error("Failed to add seller:", error);

      toast.error("Failed to add seller", {
        closeButton: true,
      });
    }
  };

  // Update sellers when edited
  const handleSellerEdit = (editedSeller: SellerData) => {
    try {
      const updatedSellers = sellersSelectOptions.map((seller) =>
        seller.id === editedSeller.id ? editedSeller : seller,
      );

      localStorage.setItem(
        SELLERS_LOCAL_STORAGE_KEY,
        JSON.stringify(updatedSellers),
      );

      setSellersSelectOptions(updatedSellers);
      setValue("seller", editedSeller);

      // end edit mode
      setEditingSeller(null);

      toast.success("Seller updated successfully", {
        richColors: true,
      });
    } catch (error) {
      console.error("Failed to edit seller:", error);

      toast.error("Failed to edit seller", {
        closeButton: true,
      });
    }
  };

  const handleSellerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;

    if (id) {
      setSelectedSellerId(id);
      const selectedSeller = sellersSelectOptions.find(
        (seller) => seller.id === id,
      );

      if (selectedSeller) {
        setValue("seller", selectedSeller);
      }
    } else {
      // Clear the seller from the form if the user selects the empty option
      setSelectedSellerId("");
      setValue("seller", DEFAULT_SELLER_DATA);
    }
  };

  const handleDeleteSeller = () => {
    try {
      setSellersSelectOptions((prevSellers) => {
        const updatedSellers = prevSellers.filter(
          (seller) => seller.id !== selectedSellerId,
        );

        localStorage.setItem(
          SELLERS_LOCAL_STORAGE_KEY,
          JSON.stringify(updatedSellers),
        );
        return updatedSellers;
      });
      // Clear the selected seller index
      setSelectedSellerId("");
      // Clear the seller from the form if it was selected
      setValue("seller", DEFAULT_SELLER_DATA);

      // Close the delete dialog
      setIsDeleteDialogOpen(false);

      toast.success("Seller deleted successfully", {
        richColors: true,
      });
    } catch (error) {
      console.error("Failed to delete seller:", error);

      toast.error("Failed to delete seller", {
        closeButton: true,
      });
    }
  };

  const activeSeller = sellersSelectOptions.find(
    (seller) => seller.id === selectedSellerId,
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        {sellersSelectOptions.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label htmlFor={sellerSelectId} className="">
                Select Seller
              </Label>
            </div>
            <div className="flex gap-2">
              <SelectNative
                id={sellerSelectId}
                className={cn(
                  "block h-8 max-w-[200px] text-[12px]",
                  !selectedSellerId && "italic text-gray-700",
                )}
                onChange={handleSellerChange}
                value={selectedSellerId}
                title={activeSeller?.name}
              >
                <option value="">No seller selected (default)</option>
                {sellersSelectOptions.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </SelectNative>

              {selectedSellerId ? (
                <div className="flex items-center gap-2">
                  <CustomTooltip
                    trigger={
                      <Button
                        _variant="outline"
                        _size="sm"
                        onClick={() => {
                          if (activeSeller) {
                            // dismiss any existing toast for better UX
                            toast.dismiss();

                            setEditingSeller(activeSeller);
                            setIsSellerDialogOpen(true);
                          }
                        }}
                        className="h-8 px-2"
                      >
                        <span className="sr-only">Edit seller</span>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    }
                    content="Edit seller"
                  />
                  <CustomTooltip
                    trigger={
                      <Button
                        _variant="destructive"
                        _size="sm"
                        onClick={() => {
                          // dismiss any existing toast for better UX
                          toast.dismiss();

                          setIsDeleteDialogOpen(true);
                        }}
                        className="h-8 px-2"
                      >
                        <span className="sr-only">Delete seller</span>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    }
                    content="Delete seller"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <CustomTooltip
          className={cn(!isLocalStorageAvailable && "bg-red-50")}
          trigger={
            <Button
              _variant="outline"
              _size="sm"
              onClick={() => {
                if (isLocalStorageAvailable) {
                  // dismiss any existing toast for better UX
                  toast.dismiss();

                  // open seller dialog
                  setIsSellerDialogOpen(true);
                } else {
                  toast.error("Unable to add seller", {
                    description: (
                      <>
                        <p className="text-pretty text-xs leading-relaxed text-red-700">
                          Local storage is not available in your browser. Please
                          enable it or try another browser.
                        </p>
                      </>
                    ),
                  });
                }
              }}
              aria-disabled={!isLocalStorageAvailable} // better UX than 'disabled'
            >
              New Seller
              <Plus className="ml-1 h-3 w-3" />
            </Button>
          }
          content={
            isLocalStorageAvailable ? (
              <div className="flex items-center gap-3 p-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Save Sellers for Quick Access
                  </p>
                  <p className="text-pretty text-xs leading-relaxed text-slate-700">
                    Store multiple sellers to easily reuse their information in
                    future invoices. All data is saved locally in your browser.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-red-50 p-3">
                <AlertCircleIcon className="h-5 w-5 flex-shrink-0 fill-red-600 text-white" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-800">
                    Storage Not Available
                  </p>
                  <p className="text-pretty text-xs leading-relaxed text-red-700">
                    Local storage is not available in your browser. Please
                    enable it or try another browser to save seller information.
                  </p>
                </div>
              </div>
            )
          }
        />
      </div>

      <SellerDialog
        // we need to rerender the dialog when the editingSeller changes
        key={editingSeller?.id}
        isOpen={isSellerDialogOpen}
        onClose={() => {
          setIsSellerDialogOpen(false);
          setEditingSeller(null);
        }}
        handleSellerAdd={handleSellerAdd}
        handleSellerEdit={handleSellerEdit}
        initialData={editingSeller}
        isEditMode={isEditMode}
        formValues={formValues}
      />

      {/* Delete alert seller dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Seller</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-bold">
                &quot;{activeSeller?.name}&quot;
              </span>{" "}
              seller? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeller}
              className="bg-red-500 text-red-50 hover:bg-red-500/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
