"use client";
import { PageHeader } from "@ant-design/pro-layout";
import {
  AuthRestrict,
  OrganizationSettingsLayout,
  Redirect,
  SharedLayout,
  useOrganizationLoading,
  useOrganizationSlug,
} from "@/appcomponents";
import {
  OrganizationPage_OrganizationFragment,
  useOrganizationPageQuery,
  useUpdateOrganizationMutation,
} from "@/appgraphqlgenerated";
import { extractError, formItemLayout, tailFormItemLayout } from "@/applib";
import { Alert, Button, Form, Input, message } from "antd";
import { useForm } from "antd/lib/form/Form";
import { useRouter } from "next/navigation";
import { Store } from "rc-field-form/lib/interface";
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
      {organizationLoadingElement || (
        <OrganizationSettingsPageInner organization={organization!} />
      )}
    </SharedLayout>
  );
}

interface OrganizationSettingsPageInnerProps {
  organization: OrganizationPage_OrganizationFragment;
}

const OrganizationSettingsPageInner: FC<OrganizationSettingsPageInnerProps> = (
  props
) => {
  const { organization } = props;
  const { name, slug } = organization;
  const router = useRouter();

  const [form] = useForm();
  const [updateOrganization] = useUpdateOrganizationMutation();
  const [error, setError] = useState<Error | null>(null);
  const handleSubmit = useCallback(
    async (values: Store) => {
      try {
        setError(null);
        const { data } = await updateOrganization({
          variables: {
            input: {
              id: organization.id,
              patch: { slug: values.slug, name: values.name },
            },
          },
        });
        message.success("Organization updated");
        const newSlug = data?.updateOrganization?.organization?.slug;
        if (newSlug && newSlug !== organization.slug) {
          router.push(`/o/${newSlug}/settings`);
        }
      } catch (e: any) {
        setError(e);
      }
    },
    [router, organization.id, organization.slug, updateOrganization]
  );

  if (
    !organization.currentUserIsBillingContact &&
    !organization.currentUserIsOwner
  ) {
    return <Redirect href={`/o/${organization.slug}`} />;
  }

  return (
    <OrganizationSettingsLayout organization={organization}>
      <div>
        <PageHeader title="Profile" />
        <Form
          {...formItemLayout}
          form={form}
          onFinish={handleSubmit}
          initialValues={{
            slug,
            name,
          }}
        >
          <Form.Item
            label="Organization name"
            name="name"
            rules={[
              { required: true, message: "Organization name is required" },
              { min: 1, message: "Organization name must not be empty" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Slug"
            name="slug"
            rules={[
              { required: true, message: "Slug is required" },
              { min: 2, message: "Slug must be at least 2 characters long" },
            ]}
          >
            <Input />
          </Form.Item>
          {error ? (
            <Form.Item>
              <Alert
                type="error"
                message={`Updating organization`}
                description={<span>{extractError(error).message}</span>}
              />
            </Form.Item>
          ) : null}
          <Form.Item {...tailFormItemLayout}>
            <Button htmlType="submit">Update organization</Button>
          </Form.Item>
        </Form>
      </div>
    </OrganizationSettingsLayout>
  );
};
