import { type ComponentType } from "react";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

/** Base props for all tool call components.
 *  Use `ToolCallProps<TInput, TOutput>` in individual tool components
 *  for type-safe input/output. The registry uses the unparameterized form. */
export interface ToolCallProps<
  TInput = unknown,
  TOutput = unknown,
> {
  input: TInput;
  output: TOutput | undefined;
  isLoading: boolean;
}

interface ToolRegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Call: ComponentType<ToolCallProps<any, any>>;
}

const WebSearchCall = lazyWithRetry(
  () => import("./web-search").then((m) => ({ default: m.WebSearchCall })),
  "web-search",
);
const WebContentsCall = lazyWithRetry(
  () => import("./web-contents").then((m) => ({ default: m.WebContentsCall })),
  "web-contents",
);
const WebAnswerCall = lazyWithRetry(
  () => import("./web-answer").then((m) => ({ default: m.WebAnswerCall })),
  "web-answer",
);
const CustomerFilesCall = lazyWithRetry(
  () => import("./customer-files").then((m) => ({ default: m.CustomerFilesCall })),
  "customer-files",
);
const ListCustomerFilesCall = lazyWithRetry(
  () => import("./list-customer-files").then((m) => ({ default: m.ListCustomerFilesCall })),
  "list-customer-files",
);
const CreateCustomerCall = lazyWithRetry(
  () => import("./create-customer").then((m) => ({ default: m.CreateCustomerCall })),
  "create-customer",
);
const ListCustomersCall = lazyWithRetry(
  () => import("./list-customers").then((m) => ({ default: m.ListCustomersCall })),
  "list-customers",
);
const GetCustomerCall = lazyWithRetry(
  () => import("./get-customer").then((m) => ({ default: m.GetCustomerCall })),
  "get-customer",
);
const UpdateCustomerCall = lazyWithRetry(
  () => import("./update-customer").then((m) => ({ default: m.UpdateCustomerCall })),
  "update-customer",
);
const DeleteCustomerCall = lazyWithRetry(
  () => import("./delete-customer").then((m) => ({ default: m.DeleteCustomerCall })),
  "delete-customer",
);
const CreateServiceCall = lazyWithRetry(
  () => import("./create-service").then((m) => ({ default: m.CreateServiceCall })),
  "create-service",
);
const ListServicesCall = lazyWithRetry(
  () => import("./list-services").then((m) => ({ default: m.ListServicesCall })),
  "list-services",
);
const GetServiceCall = lazyWithRetry(
  () => import("./get-service").then((m) => ({ default: m.GetServiceCall })),
  "get-service",
);
const UpdateServiceCall = lazyWithRetry(
  () => import("./update-service").then((m) => ({ default: m.UpdateServiceCall })),
  "update-service",
);
const DeleteServiceCall = lazyWithRetry(
  () => import("./delete-service").then((m) => ({ default: m.DeleteServiceCall })),
  "delete-service",
);
const AssignServiceCall = lazyWithRetry(
  () => import("./assign-service").then((m) => ({ default: m.AssignServiceCall })),
  "assign-service",
);
const ListCustomerServicesCall = lazyWithRetry(
  () => import("./list-customer-services").then((m) => ({ default: m.ListCustomerServicesCall })),
  "list-customer-services",
);
const RemoveServiceCall = lazyWithRetry(
  () => import("./remove-service").then((m) => ({ default: m.RemoveServiceCall })),
  "remove-service",
);
const CreateProductCall = lazyWithRetry(
  () => import("./create-product").then((m) => ({ default: m.CreateProductCall })),
  "create-product",
);
const ListProductsCall = lazyWithRetry(
  () => import("./list-products").then((m) => ({ default: m.ListProductsCall })),
  "list-products",
);
const GetProductCall = lazyWithRetry(
  () => import("./get-product").then((m) => ({ default: m.GetProductCall })),
  "get-product",
);
const UpdateProductCall = lazyWithRetry(
  () => import("./update-product").then((m) => ({ default: m.UpdateProductCall })),
  "update-product",
);
const DeleteProductCall = lazyWithRetry(
  () => import("./delete-product").then((m) => ({ default: m.DeleteProductCall })),
  "delete-product",
);
const AssignProductCall = lazyWithRetry(
  () => import("./assign-product").then((m) => ({ default: m.AssignProductCall })),
  "assign-product",
);
const ListCustomerProductsCall = lazyWithRetry(
  () => import("./list-customer-products").then((m) => ({ default: m.ListCustomerProductsCall })),
  "list-customer-products",
);
const RemoveProductCall = lazyWithRetry(
  () => import("./remove-product").then((m) => ({ default: m.RemoveProductCall })),
  "remove-product",
);
const SearchCatalogCall = lazyWithRetry(
  () => import("./search-catalog/search-catalog-call").then((m) => ({ default: m.SearchCatalogCall })),
  "search-catalog",
);
const GenerateImageCall = lazyWithRetry(
  () => import("./generate-image").then((m) => ({ default: m.GenerateImageCall })),
  "generate-image",
);
const EditImageCall = lazyWithRetry(
  () => import("./edit-image").then((m) => ({ default: m.EditImageCall })),
  "edit-image",
);
const CreateNoteCall = lazyWithRetry(
  () => import("./create-note/create-note-call").then((m) => ({ default: m.CreateNoteCall })),
  "create-note",
);
const ListNotesCall = lazyWithRetry(
  () => import("./list-notes/list-notes-call").then((m) => ({ default: m.ListNotesCall })),
  "list-notes",
);
const UpdateNoteCall = lazyWithRetry(
  () => import("./update-note/update-note-call").then((m) => ({ default: m.UpdateNoteCall })),
  "update-note",
);
const DeleteNoteCall = lazyWithRetry(
  () => import("./delete-note/delete-note-call").then((m) => ({ default: m.DeleteNoteCall })),
  "delete-note",
);
const SendEmailCall = lazyWithRetry(
  () => import("./send-email/send-email-call").then((m) => ({ default: m.SendEmailCall })),
  "send-email",
);
const SendWhatsAppCall = lazyWithRetry(
  () => import("./send-whatsapp/send-whatsapp-call").then((m) => ({ default: m.SendWhatsAppCall })),
  "send-whatsapp",
);
const CreateTransactionCall = lazyWithRetry(
  () => import("./create-transaction/create-transaction-call").then((m) => ({ default: m.CreateTransactionCall })),
  "create-transaction",
);
const ListTransactionsCall = lazyWithRetry(
  () => import("./list-transactions/list-transactions-call").then((m) => ({ default: m.ListTransactionsCall })),
  "list-transactions",
);
const UpdateTransactionStatusCall = lazyWithRetry(
  () => import("./update-transaction-status/update-transaction-status-call").then((m) => ({ default: m.UpdateTransactionStatusCall })),
  "update-transaction-status",
);
const BillingSummaryCall = lazyWithRetry(
  () => import("./billing-summary/billing-summary-call").then((m) => ({ default: m.BillingSummaryCall })),
  "billing-summary",
);

export const toolRegistry: Record<string, ToolRegistryEntry> = {
  webSearch: { Call: WebSearchCall },
  webContents: { Call: WebContentsCall },
  webAnswer: { Call: WebAnswerCall },
  searchCustomerFiles: { Call: CustomerFilesCall },
  searchCatalog: { Call: SearchCatalogCall },
  listCustomerFiles: { Call: ListCustomerFilesCall },
  createCustomer: { Call: CreateCustomerCall },
  listCustomers: { Call: ListCustomersCall },
  getCustomer: { Call: GetCustomerCall },
  updateCustomer: { Call: UpdateCustomerCall },
  deleteCustomer: { Call: DeleteCustomerCall },
  createService: { Call: CreateServiceCall },
  listServices: { Call: ListServicesCall },
  getService: { Call: GetServiceCall },
  updateService: { Call: UpdateServiceCall },
  deleteService: { Call: DeleteServiceCall },
  assignServiceToCustomer: { Call: AssignServiceCall },
  listCustomerServices: { Call: ListCustomerServicesCall },
  removeServiceFromCustomer: { Call: RemoveServiceCall },
  createProduct: { Call: CreateProductCall },
  listProducts: { Call: ListProductsCall },
  getProduct: { Call: GetProductCall },
  updateProduct: { Call: UpdateProductCall },
  deleteProduct: { Call: DeleteProductCall },
  assignProductToCustomer: { Call: AssignProductCall },
  listCustomerProducts: { Call: ListCustomerProductsCall },
  removeProductFromCustomer: { Call: RemoveProductCall },
  generateImage: { Call: GenerateImageCall },
  editImage: { Call: EditImageCall },
  createNote: { Call: CreateNoteCall },
  listNotes: { Call: ListNotesCall },
  updateNote: { Call: UpdateNoteCall },
  deleteNote: { Call: DeleteNoteCall },
  sendEmail: { Call: SendEmailCall },
  sendWhatsApp: { Call: SendWhatsAppCall },
  createTransaction: { Call: CreateTransactionCall },
  listTransactions: { Call: ListTransactionsCall },
  updateTransactionStatus: { Call: UpdateTransactionStatusCall },
  getBillingSummary: { Call: BillingSummaryCall },
};
