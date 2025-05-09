"use client";
import {
  AuthRestrict,
  Col,
  PasswordStrength,
  Row,
  SharedLayout,
} from "@/appcomponents";
import {
  useResetPasswordMutation,
  useSharedQuery,
} from "@/appgraphqlgenerated";
import { formItemLayout, setPasswordInfo, tailFormItemLayout } from "@/applib";
import { Alert, Button, Form, Input } from "antd";
import { useForm } from "antd/lib/form/Form";
import get from "lodash/get";
import { NextPage } from "next";
import { Store } from "rc-field-form/lib/interface";
import React, { FocusEvent, Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

interface IProps {
  userId: string | null;
  token: string | null;
}

enum State {
  PENDING = "PENDING",
  SUBMITTING = "SUBMITTING",
  SUCCESS = "SUCCESS",
}

const ResetPage: NextPage<IProps> = ({
  userId: rawUserId,
  token: rawToken,
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const [passwordSuggestions, setPasswordSuggestions] = useState<string[]>([]);
  const [state, setState] = useState<State>(State.PENDING);
  const query = useSharedQuery();
  const [form] = useForm();

  const [[userId, token], setIdAndToken] = useState<[string, string]>([
    rawUserId || "",
    rawToken || "",
  ]);

  const [resetPassword] = useResetPasswordMutation();

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const [passwordIsFocussed, setPasswordIsFocussed] = useState(false);
  const setPasswordFocussed = useCallback(() => {
    setPasswordIsFocussed(true);
  }, [setPasswordIsFocussed]);
  const setPasswordNotFocussed = useCallback(() => {
    setPasswordIsFocussed(false);
  }, [setPasswordIsFocussed]);

  const [confirmDirty, setConfirmDirty] = useState(false);

  const compareToFirstPassword = useCallback(
    async (_rule: any, value: any) => {
      if (value && value !== form.getFieldValue("password")) {
        throw "Make sure your passphrase is the same in both passphrase boxes.";
      }
    },
    [form]
  );

  const handleConfirmBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setConfirmDirty(confirmDirty || !!value);
    },
    [confirmDirty]
  );

  const handleSubmit = useCallback(
    (values: Store) => {
      setState(State.SUBMITTING);
      setError(null);
      (async () => {
        try {
          const result = await resetPassword({
            variables: {
              userId,
              token,
              password: values.password,
            },
          });
          if (get(result, "data.resetPassword.success")) {
            setState(State.SUCCESS);
          } else {
            setState(State.PENDING);
            setError(new Error("Incorrect token, please check and try again"));
          }
        } catch (e: any) {
          if (e.message) {
            setError(e);
          } else {
            setError(new Error("Please check the errors above and try again"));
            console.dir(e);
          }
          setState(State.PENDING);
        }
      })();
    },
    [resetPassword, token, userId]
  );
  const [passwordIsDirty, setPasswordIsDirty] = useState(false);
  const handleValuesChange = useCallback(
    (changedValues: any) => {
      setPasswordInfo(
        { setPasswordStrength, setPasswordSuggestions },
        changedValues
      );
      setPasswordIsDirty(form.isFieldTouched("password"));
      if (changedValues.confirm) {
        if (form.isFieldTouched("password")) {
          form.validateFields(["password"]);
        }
      } else if (changedValues.password) {
        if (form.isFieldTouched("confirm")) {
          form.validateFields(["confirm"]);
        }
      }
    },
    [form]
  );

  return (
    <SharedLayout
      title="Reset Password"
      query={query}
      forbidWhen={
        // reset is used to change password of OAuth-authenticated users
        AuthRestrict.NEVER
      }
    >
      <Row>
        <Col flex={1}>
          <div>
            {state === "SUBMITTING" ? (
              <Alert
                type="info"
                message="Submitting..."
                description="This might take a few moments..."
              />
            ) : state === "SUCCESS" ? (
              <Alert
                type="success"
                message="Password Reset"
                description="Your password was reset; you can go and log in now"
              />
            ) : null}

            <Form
              {...formItemLayout}
              form={form}
              onFinish={handleSubmit}
              onValuesChange={handleValuesChange}
              style={{ display: state === State.PENDING ? "" : "none" }}
            >
              <Form.Item label="Enter your reset token:">
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setIdAndToken([userId, e.target.value])}
                />
              </Form.Item>
              <Form.Item label="Choose a new passphrase:" required>
                <Form.Item
                  noStyle
                  name="password"
                  rules={[
                    {
                      required: true,
                      message: "Please input your passphrase.",
                    },
                  ]}
                >
                  <Input
                    type="password"
                    autoComplete="new-password"
                    data-cy="registerpage-input-password"
                    onFocus={setPasswordFocussed}
                    onBlur={setPasswordNotFocussed}
                  />
                </Form.Item>
                <PasswordStrength
                  passwordStrength={passwordStrength}
                  suggestions={passwordSuggestions}
                  isDirty={passwordIsDirty}
                  isFocussed={passwordIsFocussed}
                />
              </Form.Item>
              <Form.Item
                label="Confirm passphrase"
                name="confirm"
                rules={[
                  {
                    required: true,
                    message: "Please confirm your passphrase.",
                  },
                  {
                    validator: compareToFirstPassword,
                  },
                ]}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  onBlur={handleConfirmBlur}
                  data-cy="registerpage-input-password2"
                />
              </Form.Item>
              {error ? (
                <Form.Item>
                  <Alert
                    type="error"
                    closable
                    onClose={clearError}
                    message={
                      error.message ? String(error.message) : String(error)
                    }
                  />
                </Form.Item>
              ) : null}
              <Form.Item {...tailFormItemLayout}>
                <Button htmlType="submit" data-cy="resetpage-submit-button">
                  Reset passphrase
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>
      </Row>
    </SharedLayout>
  );
};

function ResetPagePage() {
  const searchParams = useSearchParams();
  return (
    <ResetPage
      userId={searchParams.get("user_id")}
      token={searchParams.get("token")}
    />
  );
}

export default function ResetPagePageWrapper() {
  return (
    <Suspense>
      <ResetPagePage />
    </Suspense>
  );
}
