Feature: A refused plus or minus press leaves nothing behind for the next draw to announce

  The status region of a ranked group says what a plus or minus press changed, once. A press the build
  refuses changes nothing, so the next change to that group (here a re-rank) must not be taken for the
  press's result: its own notice is the only thing announced.

  Background:
    Given I am on the Attributes screen of a new build

  Scenario: A rank change after a refused press on a full group announces only the rank notice
    Given Social is Primary with 7 of 7 additional dots placed
    When I try to raise another Social Attribute
    Then I am told the Social group has no dots left
    When I set Social to Secondary
    Then exactly one message is announced and it reads "Social is now Secondary."
    And the Social status region is empty
