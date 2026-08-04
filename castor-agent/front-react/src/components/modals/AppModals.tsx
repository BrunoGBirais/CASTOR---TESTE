import { AddressOverrideModal } from "./AddressOverrideModal";
import { AdminBulkReassignModal } from "./AdminBulkReassignModal";
import { AdminCardReassignModal } from "./AdminCardReassignModal";
import { AdminSuggestModal } from "./AdminSuggestModal";
import { AdminTaskAssignModal } from "./AdminTaskAssignModal";
import { ClientDetailModal } from "./ClientDetailModal";
import { ClientMapModal } from "./ClientMapModal";
import { ConfirmModal } from "./ConfirmModal";
import { DeleteUserModal } from "./DeleteUserModal";
import { FeedbackModal } from "./FeedbackModal";
import { FollowupsModal } from "./FollowupsModal";
import { InteractionAddModal } from "./InteractionAddModal";
import { LoginOverlay } from "./LoginOverlay";
import { PortfolioModal } from "./PortfolioModal";
import { RouteModal } from "./RouteModal";
import { SavedRouteDetailModal } from "./SavedRouteDetailModal";
import { SavedRoutesModal } from "./SavedRoutesModal";
import { SkippedClientsModal } from "./SkippedClientsModal";

/**
 * Todos os modais ficam fora de `.app-container`, na mesma ordem do legado.
 * Sao `position: fixed`, entao a posicao na arvore nao afeta o layout — mas a
 * ordem define o empilhamento entre elementos de mesmo z-index.
 */
export const AppModals = () => (
  <>
    <FeedbackModal />
    <AddressOverrideModal />
    <SkippedClientsModal />
    <FollowupsModal />
    <PortfolioModal />
    <InteractionAddModal />
    <RouteModal />
    <ClientMapModal />
    <SavedRoutesModal />
    <SavedRouteDetailModal />
    <ClientDetailModal />
    <LoginOverlay />
    <DeleteUserModal />
    <AdminTaskAssignModal />
    <AdminSuggestModal />
    <AdminCardReassignModal />
    <AdminBulkReassignModal />
    <ConfirmModal />
  </>
);
