/** Shared invitee JSON shape for roster APIs and the organizer UI. */

export type InviteeResponseJson = {
  id: string;
  answer: string;
  count: number;
  updatedAt: string;
};

export type InviteeJson = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  token: string;
  textedAt: string | null;
  textedById: string | null;
  textedByName: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
  addedById: string | null;
  addedByName: string | null;
  pcoPersonId: string | null;
  createdAt: string;
  response: InviteeResponseJson | null;
};

export function serializeInvitee(inv: {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  token: string;
  textedAt: Date | null;
  textedById?: string | null;
  textedByName?: string | null;
  firstOpenedAt: Date | null;
  lastOpenedAt: Date | null;
  openCount: number;
  addedById?: string | null;
  addedByName?: string | null;
  pcoPersonId: string | null;
  createdAt: Date;
  response: {
    id: string;
    answer: string;
    count: number;
    updatedAt: Date;
  } | null;
}): InviteeJson {
  return {
    id: inv.id,
    firstName: inv.firstName,
    lastName: inv.lastName,
    displayName: inv.displayName,
    phone: inv.phone,
    token: inv.token,
    textedAt: inv.textedAt?.toISOString() ?? null,
    textedById: inv.textedById ?? null,
    textedByName: inv.textedByName ?? null,
    firstOpenedAt: inv.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: inv.lastOpenedAt?.toISOString() ?? null,
    openCount: inv.openCount,
    addedById: inv.addedById ?? null,
    addedByName: inv.addedByName ?? null,
    pcoPersonId: inv.pcoPersonId,
    createdAt: inv.createdAt.toISOString(),
    response: inv.response
      ? {
          id: inv.response.id,
          answer: inv.response.answer,
          count: inv.response.count,
          updatedAt: inv.response.updatedAt.toISOString(),
        }
      : null,
  };
}
