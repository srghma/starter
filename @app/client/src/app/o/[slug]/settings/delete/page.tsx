"use client";
import { PageHeader } from "@ant-design/pro-layout";
import { ApolloError } from "@apollo/client";
import {
  AuthRestrict,
  ErrorAlert,
  OrganizationSettingsLayout,
  P,
  SharedLayout,
  useOrganizationLoading,
  useOrganizationSlug,
} from "@/appcomponents";
import {
  OrganizationPage_OrganizationFragment,
  SharedLayout_UserFragment,
  useDeleteOrganizationMutation,
  useOrganizationPageQuery,
} from "@/appgraphqlgenerated";
import { Alert, Button, message, Popconfirm } from "antd";
import { NextPage } from "next";
import { useRouter } from "next/navigation";
import React, { FC, useCallback, useState } from "react";

export default function OrganizationSettingsPage() {
  const slug = useOrganizationSlug();
  const query = useOrganizationPageQuery({ variables: { slug } });
  const organizationLoadingElement = useOrganizationLoading(query);
  const organization = query?.data?.organizationBySlug;

  return (
    <SharedLayout
      title={organization?.name ?? slug}
      titleHref={`/o/[slug]`}
      titleHrefAs={`/o/${slug}`}
      noPad
      query={query}
      forbidWhen={AuthRestrict.LOGGED_OUT}
    >
      {({ currentUser }) =>
        organizationLoadingElement || (
          <OrganizationSettingsPageInner
            organization={organization!}
            currentUser={currentUser}
          />
        )
      }
    </SharedLayout>
  );
}

interface OrganizationSettingsPageInnerProps {
  currentUser?: SharedLayout_UserFragment | null;
  organization: OrganizationPage_OrganizationFragment;
}

const OrganizationSettingsPageInner: FC<OrganizationSettingsPageInnerProps> = (
  props
) => {
  const { organization } = props;
  const router = useRouter();
  const [deleteOrganization] = useDeleteOrganizationMutation();
  const [error, setError] = useState<ApolloError | null>(null);
  const handleDelete = useCallback(async () => {
    try {
      await deleteOrganization({
        variables: {
          organizationId: organization.id,
        },
        refetchQueries: ["SharedLayout"],
      });
      message.info(`Organization '${organization.name}' successfully deleted`);
      router.push("/");
    } catch (e: any) {
      setError(e);
      return;
    }
  }, [deleteOrganization, organization.id, organization.name, router]);
  return (
    <OrganizationSettingsLayout organization={organization}>
      <div>
        <PageHeader title="Delete Organization?" />
        {organization.currentUserIsOwner ? (
          <Alert
            type="error"
            message={`Really delete '${organization.name}'`}
            description={
              <div>
                <P>This action cannot be undone, be very careful.</P>
                <Popconfirm
                  title={`Are you sure you want to delete ${organization.name}?`}
                  onConfirm={handleDelete}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button>Delete this organization</Button>
                </Popconfirm>
              </div>
            }
          />
        ) : (
          <Alert
            type="warning"
            message="You are not permitted to do this"
            description="Only the owner may delete the organization. If you cannot reach the owner, please get in touch with support."
          />
        )}
        {error ? <ErrorAlert error={error} /> : null}
      </div>
    </OrganizationSettingsLayout>
  );
};
