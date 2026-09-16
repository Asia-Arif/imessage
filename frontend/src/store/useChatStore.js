import { create } from "zustand";
import { persist } from "zustand/middleware";

import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

export const useChatStore = create(
  persist(
    (set, get) => ({
      users: [],
      conversations: [],
      messages: [],
      selectedUser: null,
      isConversationsLoading: false,
      isUsersLoading: false,
      isMessagesLoading: false,
      activeConversationId: null,
      searchQuery: "",
      sidebarTab: "chats",
      composerText: "",
      isSoundEnabled: true,
      isSendingMedia: false,

      showSubscriptionModal: false,

      // Users who have sent a new/unread message
      unreadMessageIds: [],

      getUsers: async () => {
        set({ isUsersLoading: true });

        try {
          const res = await axiosInstance.get(
            "/messages/users"
          );

          const users = Array.isArray(res.data)
            ? res.data
            : [];

          set((state) => ({
            users,
            selectedUser:
              state.selectedUser &&
              users.some(
                (user) =>
                  user._id ===
                  state.selectedUser._id
              )
                ? state.selectedUser
                : null,
          }));
        } catch (error) {
          toast.error(
            error.response?.data?.message ||
              "Failed to load users"
          );
        } finally {
          set({ isUsersLoading: false });
        }
      },

      getConversations: async () => {
        set({
          isConversationsLoading: true,
        });

        try {
          const res = await axiosInstance.get(
            "/messages/conversations"
          );

          set({
            conversations: Array.isArray(res.data)
              ? res.data
              : [],
          });
        } catch (error) {
          console.log(
            "Error in getConversations",
            error.message
          );
        } finally {
          set({
            isConversationsLoading: false,
          });
        }
      },

      getMessages: async (userId) => {
        if (!userId) return;

        set({
          isMessagesLoading: true,
        });

        try {
          const res = await axiosInstance.get(
            `/messages/${userId}`
          );

          set({
            messages: Array.isArray(res.data)
              ? res.data
              : [],
          });

          // Opening this conversation marks its messages as read
          set((state) => ({
            unreadMessageIds:
              state.unreadMessageIds.filter(
                (id) =>
                  String(id) !== String(userId)
              ),
          }));
        } catch (error) {
          toast.error(
            error.response?.data?.message ||
              "Failed to load messages"
          );
        } finally {
          set({
            isMessagesLoading: false,
          });
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser } = get();

        if (!selectedUser) {
          return false;
        }

        try {
          const res = await axiosInstance.post(
            `/messages/send/${selectedUser._id}`,
            messageData
          );

          set((state) => ({
            messages: [
              ...state.messages,
              res.data,
            ],
            composerText: "",
          }));

          get().getConversations();

          return true;
        } catch (error) {
          /*
           * FREE CHAT LIMIT REACHED
           *
           * Backend returns 402 when the user tries
           * to chat with a 3rd unique person.
           */
          if (
            error.response?.status === 402 ||
            error.response?.data
              ?.subscriptionRequired === true
          ) {
            set({
              showSubscriptionModal: true,
            });

            return false;
          }

          toast.error(
            error.response?.data?.message ||
              "Failed to send message"
          );

          return false;
        }
      },

      createCheckoutSession: async () => {
        try {
          const res =
            await axiosInstance.post(
              "/payments/create-checkout-session"
            );

          if (res.data.url) {
            window.location.href = res.data.url;
          }
        } catch (error) {
          toast.error(
            error.response?.data?.message ||
              "Unable to start subscription"
          );
        }
      },

      closeSubscriptionModal: () => {
        set({
          showSubscriptionModal: false,
        });
      },

      confirmSubscription: async () => {
        set({
          showSubscriptionModal: false,
        });

        await get().createCheckoutSession();
      },

      subscribeToMessages: (userId) => {
        const socket =
          useAuthStore.getState().socket;

        if (!socket) return;

        socket.off("newMessage");

        socket.on(
          "newMessage",
          (newMessage) => {
            const currentUser =
              useAuthStore.getState().authUser;

            if (!currentUser) return;

            // Ignore our own message
            if (
              String(newMessage.senderId) ===
              String(currentUser._id)
            ) {
              return;
            }

            const senderId = String(
              newMessage.senderId
            );

            const currentConversationId = userId
              ? String(userId)
              : null;

            /*
             * If message is from the currently open chat,
             * show it directly without unread indicator.
             */
            if (
              currentConversationId === senderId
            ) {
              set((state) => ({
                messages: [
                  ...state.messages,
                  newMessage,
                ],

                unreadMessageIds:
                  state.unreadMessageIds.filter(
                    (id) =>
                      String(id) !== senderId
                  ),
              }));
            } else {
              /*
               * Message is from another user.
               * Add that user's ID to unread list.
               */
              set((state) => {
                const alreadyUnread =
                  state.unreadMessageIds.some(
                    (id) =>
                      String(id) === senderId
                  );

                if (alreadyUnread) {
                  return state;
                }

                return {
                  unreadMessageIds: [
                    ...state.unreadMessageIds,
                    senderId,
                  ],
                };
              });
            }

            // Keep conversation list updated
            get().getConversations();
          }
        );
      },

      unsubscribeFromMessages: () => {
        const socket =
          useAuthStore.getState().socket;

        socket?.off("newMessage");
      },

      setSelectedUser: (selectedUser) => {
        set({
          selectedUser,
        });
      },

      setActiveConversationId: (
        activeConversationId
      ) => {
        set((state) => ({
          activeConversationId,

          selectedUser:
            state.users.find(
              (user) =>
                user._id ===
                activeConversationId
            ) ||
            state.conversations.find(
              (user) =>
                user._id ===
                activeConversationId
            ) ||
            null,

          messages: activeConversationId
            ? state.messages
            : [],

          // Opening chat clears its unread indicator
          unreadMessageIds:
            state.unreadMessageIds.filter(
              (id) =>
                String(id) !==
                String(activeConversationId)
            ),
        }));
      },

      setSearchQuery: (searchQuery) => {
        set({
          searchQuery,
        });
      },

      setSidebarTab: (sidebarTab) => {
        set({
          sidebarTab,
        });
      },

      setComposerText: (composerText) => {
        set({
          composerText,
        });
      },

      setSoundEnabled: (isSoundEnabled) => {
        set({
          isSoundEnabled,
        });
      },

      sendTextMessage: async (
        conversationId
      ) => {
        const messageText =
          get().composerText.trim();

        if (
          !conversationId ||
          !messageText
        ) {
          return false;
        }

        return get().sendMessage({
          text: messageText,
        });
      },

      sendMediaMessage: async ({
        conversationId,
        file,
      }) => {
        if (!conversationId || !file) {
          return false;
        }

        const formData = new FormData();

        formData.append("media", file);

        set({
          isSendingMedia: true,
        });

        try {
          return await get().sendMessage(
            formData
          );
        } finally {
          set({
            isSendingMedia: false,
          });
        }
      },
    }),
    {
      name: "imessage-storage",

      partialize: (state) => ({
        isSoundEnabled:
          state.isSoundEnabled,

        // Keep unread state after refresh
        unreadMessageIds:
          state.unreadMessageIds,
      }),
    }
  )
);