import { createWebSearchTool, createWebAnswerTool } from "./exa/webSearch";
import { createWebContentsTool } from "./exa/webContents";
import { createSearchCustomerFilesTool } from "./searchCustomerFiles";
import { createListCustomerFilesTool } from "./listCustomerFiles";
import { createSendEmailTool } from "./messaging/sendEmail";
import { createSendWhatsAppTool } from "./messaging/sendWhatsApp";
import { createSendBulkEmailTool } from "./messaging/sendBulkEmail";
import { createSendBulkWhatsAppTool } from "./messaging/sendBulkWhatsApp";
import { createCreateCustomerTool } from "./customers/createCustomer";
import { createListCustomersTool } from "./customers/listCustomers";
import { createGetCustomerTool } from "./customers/getCustomer";
import { createUpdateCustomerTool } from "./customers/updateCustomer";
import { createDeleteCustomerTool } from "./customers/deleteCustomer";
import { createCreateNoteTool } from "./notes/createNote";
import { createListNotesTool } from "./notes/listNotes";
import { createUpdateNoteTool } from "./notes/updateNote";
import { createDeleteNoteTool } from "./notes/deleteNote";
import { createGenerateImageTool } from "./image/generateImage";
import { createEditImageTool } from "./image/editImage";
import { createCreateServiceTool } from "./services/createService";
import { createListServicesTool } from "./services/listServices";
import { createGetServiceTool } from "./services/getService";
import { createUpdateServiceTool } from "./services/updateService";
import { createDeleteServiceTool } from "./services/deleteService";
import { createAssignServiceToCustomerTool } from "./services/assignServiceToCustomer";
import { createListCustomerServicesTool } from "./services/listCustomerServices";
import { createRemoveServiceFromCustomerTool } from "./services/removeServiceFromCustomer";
import { createCreateTransactionTool } from "./transactions/createTransaction";
import { createListTransactionsTool } from "./transactions/listTransactions";
import { createUpdateTransactionStatusTool } from "./transactions/updateTransactionStatus";
import { createGetBillingSummaryTool } from "./transactions/getBillingSummary";
import { createCreateProductTool } from "./products/createProduct";
import { createListProductsTool } from "./products/listProducts";
import { createGetProductTool } from "./products/getProduct";
import { createUpdateProductTool } from "./products/updateProduct";
import { createDeleteProductTool } from "./products/deleteProduct";
import { createAssignProductToCustomerTool } from "./products/assignProductToCustomer";
import { createListCustomerProductsTool } from "./products/listCustomerProducts";
import { createRemoveProductFromCustomerTool } from "./products/removeProductFromCustomer";
import { createAddProductPhotoTool } from "./products/addProductPhoto";
import { createSearchCatalogTool } from "./searchCatalog";
import { createCreateProductTransactionTool } from "./transactions/createProductTransaction";
import { createListProductTransactionsTool } from "./transactions/listProductTransactions";
import { createUpdateProductTransactionStatusTool } from "./transactions/updateProductTransactionStatus";
import { createGetProductPurchaseSummaryTool } from "./transactions/getProductPurchaseSummary";
import { createDeleteServiceTransactionTool } from "./transactions/deleteServiceTransaction";
import { createDeleteProductTransactionTool } from "./transactions/deleteProductTransaction";
import { createListServiceCategoriesTool } from "./categories/listServiceCategories";
import { createCreateServiceCategoryTool } from "./categories/createServiceCategory";
import { createListProductCategoriesTool } from "./categories/listProductCategories";
import { createCreateProductCategoryTool } from "./categories/createProductCategory";
import { createCreateAppointmentTool } from "./appointments/createAppointment";
import { createListAppointmentsTool } from "./appointments/listAppointments";
import { createGetAppointmentTool } from "./appointments/getAppointment";
import { createUpdateAppointmentTool } from "./appointments/updateAppointment";
import { createCancelAppointmentTool } from "./appointments/cancelAppointment";
import { createDeleteAppointmentTool } from "./appointments/deleteAppointment";
import { createCreateCollaboratorTool } from "./collaborators/createCollaborator";
import { createListCollaboratorsTool } from "./collaborators/listCollaborators";
import { createGetCollaboratorTool } from "./collaborators/getCollaborator";
import { createUpdateCollaboratorTool } from "./collaborators/updateCollaborator";
import { createDeleteCollaboratorTool } from "./collaborators/deleteCollaborator";

const MAX_WEB_SEARCHES = 3;
const MAX_WEB_CONTENTS = 3;
const MAX_MESSAGES = 3;
const MAX_BULK_MESSAGES = 20;

export interface ToolExecutionContext {
  mode: "interactive" | "scheduled";
}

export function buildTools(customerId?: string, execCtx?: ToolExecutionContext, userId?: string, threadId?: string) {
  const counter = { webCalls: 0, contentCalls: 0, messageCalls: 0 };

  const base = {
    webSearch: createWebSearchTool(counter, MAX_WEB_SEARCHES, userId),
    webAnswer: createWebAnswerTool(counter, MAX_WEB_SEARCHES, userId),
    webContents: createWebContentsTool(counter, MAX_WEB_CONTENTS, userId),
    generateImage: createGenerateImageTool(userId, threadId),
    editImage: createEditImageTool(userId, threadId),
    searchCatalog: createSearchCatalogTool(userId),
  };

  const serviceTools = {
    createService: createCreateServiceTool(),
    listServices: createListServicesTool(),
    getService: createGetServiceTool(),
    updateService: createUpdateServiceTool(),
    deleteService: createDeleteServiceTool(execCtx),
    listServiceCategories: createListServiceCategoriesTool(),
    createServiceCategory: createCreateServiceCategoryTool(),
  };

  const productTools = {
    createProduct: createCreateProductTool(),
    listProducts: createListProductsTool(),
    getProduct: createGetProductTool(),
    updateProduct: createUpdateProductTool(),
    deleteProduct: createDeleteProductTool(execCtx),
    addProductPhoto: createAddProductPhotoTool(),
    listProductCategories: createListProductCategoriesTool(),
    createProductCategory: createCreateProductCategoryTool(),
  };

  const appointmentTools = {
    createAppointment: createCreateAppointmentTool(customerId),
    listAppointments: createListAppointmentsTool(customerId),
    getAppointment: createGetAppointmentTool(),
    updateAppointment: createUpdateAppointmentTool(),
    cancelAppointment: createCancelAppointmentTool(execCtx),
    deleteAppointment: createDeleteAppointmentTool(execCtx),
  };

  const collaboratorTools = {
    createCollaborator: createCreateCollaboratorTool(),
    listCollaborators: createListCollaboratorsTool(),
    getCollaborator: createGetCollaboratorTool(),
    updateCollaborator: createUpdateCollaboratorTool(),
    deleteCollaborator: createDeleteCollaboratorTool(execCtx),
  };

  if (!customerId) {
    return {
      ...base,
      ...serviceTools,
      ...productTools,
      ...appointmentTools,
      ...collaboratorTools,
      createCustomer: createCreateCustomerTool(),
      listCustomers: createListCustomersTool(),
      getCustomer: createGetCustomerTool(),
      updateCustomer: createUpdateCustomerTool(),
      deleteCustomer: createDeleteCustomerTool(undefined, execCtx),
      assignServiceToCustomer: createAssignServiceToCustomerTool(),
      listCustomerServices: createListCustomerServicesTool(),
      removeServiceFromCustomer: createRemoveServiceFromCustomerTool(execCtx),
      assignProductToCustomer: createAssignProductToCustomerTool(),
      listCustomerProducts: createListCustomerProductsTool(),
      removeProductFromCustomer: createRemoveProductFromCustomerTool(execCtx),
      createTransaction: createCreateTransactionTool(),
      listTransactions: createListTransactionsTool(),
      updateTransactionStatus: createUpdateTransactionStatusTool(),
      deleteTransaction: createDeleteServiceTransactionTool(execCtx),
      getBillingSummary: createGetBillingSummaryTool(),
      createProductTransaction: createCreateProductTransactionTool(),
      listProductTransactions: createListProductTransactionsTool(),
      updateProductTransactionStatus: createUpdateProductTransactionStatusTool(),
      deleteProductTransaction: createDeleteProductTransactionTool(execCtx),
      getProductPurchaseSummary: createGetProductPurchaseSummaryTool(),
      sendEmail: createSendBulkEmailTool(counter, MAX_BULK_MESSAGES, execCtx),
      sendWhatsApp: createSendBulkWhatsAppTool(counter, MAX_BULK_MESSAGES, execCtx),
    };
  }

  return {
    ...base,
    ...serviceTools,
    ...productTools,
    ...appointmentTools,
    ...collaboratorTools,
    getCustomer: createGetCustomerTool(customerId),
    updateCustomer: createUpdateCustomerTool(customerId),
    deleteCustomer: createDeleteCustomerTool(customerId, execCtx),
    assignServiceToCustomer: createAssignServiceToCustomerTool(customerId),
    listCustomerServices: createListCustomerServicesTool(customerId),
    removeServiceFromCustomer: createRemoveServiceFromCustomerTool(execCtx),
    assignProductToCustomer: createAssignProductToCustomerTool(customerId),
    listCustomerProducts: createListCustomerProductsTool(customerId),
    removeProductFromCustomer: createRemoveProductFromCustomerTool(execCtx),
    searchCustomerFiles: createSearchCustomerFilesTool(customerId, userId),
    listCustomerFiles: createListCustomerFilesTool(customerId),
    createTransaction: createCreateTransactionTool(customerId),
    listTransactions: createListTransactionsTool(customerId),
    updateTransactionStatus: createUpdateTransactionStatusTool(),
    deleteTransaction: createDeleteServiceTransactionTool(execCtx),
    getBillingSummary: createGetBillingSummaryTool(customerId),
    createProductTransaction: createCreateProductTransactionTool(customerId),
    listProductTransactions: createListProductTransactionsTool(customerId),
    updateProductTransactionStatus: createUpdateProductTransactionStatusTool(),
    deleteProductTransaction: createDeleteProductTransactionTool(execCtx),
    getProductPurchaseSummary: createGetProductPurchaseSummaryTool(customerId),
    sendEmail: createSendEmailTool(counter, MAX_MESSAGES, customerId, execCtx),
    sendWhatsApp: createSendWhatsAppTool(counter, MAX_MESSAGES, customerId, execCtx),
    createNote: createCreateNoteTool(customerId),
    listNotes: createListNotesTool(customerId),
    updateNote: createUpdateNoteTool(customerId),
    deleteNote: createDeleteNoteTool(customerId),
  };
}
