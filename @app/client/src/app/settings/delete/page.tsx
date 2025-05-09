"use client";
import { PageHeader } from "@ant-design/pro-layout";
import { ApolloError } from "@apollo/client";
import { ErrorAlert, P, SettingsLayout } from "@/appcomponents";
import {
  useConfirmAccountDeletionMutation,
  useRequestAccountDeletionMutation,
  useSharedQuery,
} from "@/appgraphqlgenerated";
import { getCodeFromError } from "@/applib";
import { Alert, Button, Modal, Typography } from "antd";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useState } from "react";

const { Text } = Typography;

function Settings_Accounts() {
  const searchParams = useSearchParams();
  const token = searchParams ? searchParams.get("token") : null;
  const [error, setError] = useState<Error | ApolloError | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itIsDone, setItIsDone] = useState(false);
  const [doingIt, setDoingIt] = useState(false);
  const openModal = useCallback(() => setConfirmOpen(true), []);
  const closeModal = useCallback(() => setConfirmOpen(false), []);
  const [requestAccountDeletion] = useRequestAccountDeletionMutation();
  const doIt = useCallback(() => {
    setError(null);
    setDoingIt(true);
    (async () => {
      try {
        const result = await requestAccountDeletion();
        if (!result) {
          throw new Error("Result expected");
        }
        const { data, errors } = result;
        if (
          !data ||
          !data.requestAccountDeletion ||
          !data.requestAccountDeletion.success
        ) {
          console.dir(errors);
          throw new Error("Requesting deletion failed");
        }
        setItIsDone(true);
      } catch (e: any) {
        setError(e);
      }
      setDoingIt(false);
      setConfirmOpen(false);
    })();
  }, [requestAccountDeletion]);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [confirmAccountDeletion] = useConfirmAccountDeletionMutation();
  const confirmDeletion = useCallback(() => {
    if (deleting || !token) {
      return;
    }
    setError(null);
    setDeleting(true);
    (async () => {
      try {
        await confirmAccountDeletion({ variables: { token } });
        // Display confirmation
        setDeleted(true);
      } catch (e: any) {
        setError(e);
      }
      setDeleting(false);
    })();
  }, [confirmAccountDeletion, deleting, token]);
  const query = useSharedQuery();
  return (
    <SettingsLayout href="/settings/delete" query={query}>
      <PageHeader title="Delete account" />
      <P>
        Deleting your user account will delete all data (except that which we
        must retain for legal, compliance and accounting reasons) and cannot be
        undone. Make sure you want to do this.
      </P>
      <P>
        To protect your account, we require you to confirm you wish to delete
        your account here, then you will be sent an email with a confirmation
        code (to check your identity) and when you click that link you will be
        asked to confirm your account deletion again.
      </P>
      {token ? (
        <Alert
          type="error"
          message="Confirm account deletion"
          description={
            <>
              <P>
                This is it.{" "}
                <Text mark>
                  Press this button and your account will be deleted.
                </Text>{" "}
                We&apos;re sorry to see you go, please don&apos;t hesitate to
                reach out and let us know why you no longer want your account.
              </P>
              <Button onClick={confirmDeletion} danger disabled={deleting}>
                PERMANENTLY DELETE MY ACCOUNT
              </Button>
            </>
          }
        />
      ) : itIsDone ? (
        <Alert
          type="warning"
          message="Confirm deletion via email link"
          description={
            <P>
              You&apos;ve been sent an email with a confirmation link in it, you
              must click it to confirm that you are the account holder so that
              you may continue deleting your account.
            </P>
          }
        />
      ) : (
        <Alert
          type="error"
          message="Delete user account?"
          description={
            <>
              <P>
                Deleting your account cannot be undone, you will lose all your
                data.
              </P>
              <Button onClick={openModal} danger>
                I want to delete my account
              </Button>
            </>
          }
        />
      )}
      {error ? (
        getCodeFromError(error) === "OWNER" ? (
          <Alert
            type="error"
            showIcon
            message="Cannot delete account"
            description={
              <>
                <P>
                  You cannot delete your account whilst you are the owner of an
                  organization.
                </P>
                <P>
                  For each organization you are the owner of, please either
                  assign your ownership to another user or delete the
                  organization to continue.
                </P>
              </>
            }
          />
        ) : (
          <ErrorAlert error={error} />
        )
      ) : null}
      <Modal
        open={confirmOpen}
        onCancel={closeModal}
        onOk={doIt}
        okText="Send delete account email"
        okType="primary"
        okButtonProps={{ danger: true }}
        title="Send delete account confirmation email?"
        confirmLoading={doingIt}
      >
        <P>
          Before we can delete your account, we need to confirm it&apos;s
          definitely you. We&apos;ll send you an email with a link in it, which
          when clicked will give you the option to delete your account.
        </P>
        <P>
          You should not trigger this unless you&apos;re sure you want to delete
          your account.
        </P>
      </Modal>
      <Modal
        open={deleted}
        closable={false}
        title="Account deleted"
        footer={
          <div>
            <Button
              type="primary"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Return to homepage
            </Button>
          </div>
        }
      >
        Your account has been successfully deleted. We wish you all the best.
      </Modal>
    </SettingsLayout>
  );
}

export default function Settings_AccountsWrapper() {
  return (
    <Suspense>
      <Settings_Accounts />
    </Suspense>
  );
}
