// Where a person starts: nothing to show yet (couldn't reach Hushmates), the welcome until
// they've been through it, a goodbye after deleting their data, else Release.
export const startScene = (state) => (!state.me ? 'away'
  : state.me.accountState === 'deleted' ? 'deleted'
    : state.me.profile?.onboarded ? 'release' : 'welcome');
