import { App, Stack } from "@aws-cdk/core";
import { Budget } from "../../lib/constructs/budget";
import { expect as expectCDK, haveResourceLike } from "@aws-cdk/assert";

test("Budget construct", () => {
  const app = new App();
  const stack = new Stack(app, "Stack");
  new Budget(stack, "Budget", {
    budgetAmount: 1,
    emailAddress: "bradley@seon.group",
  });

  expectCDK(stack).to(
    haveResourceLike("AWS::Budgets::Budget", {
      Budget: {
        BudgetLimit: {
          Amount: 1,
        },
      },
      NotificationsWithSubscribers: [
        {
          Subscribers: [
            {
              Address: "bradley@seon.group",
            },
          ],
        },
      ],
    })
  );
});
