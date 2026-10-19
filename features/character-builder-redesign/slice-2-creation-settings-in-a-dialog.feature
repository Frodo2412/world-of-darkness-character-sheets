Feature: Creation settings open in a dialog

  Background:
    Given I have just started a build

  Scenario: The dialog opens with the defaults
    When I open Creation settings
    Then base generation is 13th and extra freebie points are 0
    And the freebie pool reads 15
    And the effective generation reads 13th

  Scenario: Changing both settings
    Given the Creation settings dialog is open
    When I choose 11th generation and 75 extra freebie points
    Then the dialog shows a freebie pool of 90
    When I choose Done
    Then focus is on the Creation settings button
    When I reload the builder
    Then base generation is 11th and extra freebie points are 75

  Scenario: Effective generation shows the Generation Background
    Given a build at 10th generation with 1 dot of the Generation Background
    When I open Creation settings
    Then the effective generation reads 9th

  Scenario Outline: Boundary values for extra freebie points are accepted
    Given the Creation settings dialog is open
    When I enter "<entry>" as extra freebie points
    Then the freebie pool reads <pool>

    Examples:
      | entry | pool |
      | 0     | 15   |
      | 999   | 1014 |

  Scenario Outline: Invalid extra freebie points are rejected in the dialog
    Given the Creation settings dialog is open
    When I enter "<entry>" as extra freebie points
    Then I am told extra freebie points must be a whole number from 0 to 999
    And the freebie pool is unchanged

    Examples:
      | entry |
      | -1    |
      | 1000  |
      | 2.5   |
      | lots  |
      |       |

  Scenario: A change that breaks an allocation is refused with what to lower
    Given a build at 6th generation with 2 dots of the Generation Background
    And the Creation settings dialog is open
    When I choose 4th generation
    Then I am told to lower the Generation Background first
    And base generation is still 6th

  Scenario Outline: The base generation is limited to 4th through 13th
    Given the Creation settings dialog is open
    When I choose "<generation>" as the base generation
    Then <result>

    Examples:
      | generation | result                                   |
      | 4th        | the base generation reads 4th            |
      | 13th       | the base generation reads 13th           |
      | 3rd        | it is not offered                        |
      | 14th       | it is not offered                        |

  Scenario: A change that leaves a trait above its new maximum is refused naming the trait
    Given a build at 6th generation with a trait at 7
    And the Creation settings dialog is open
    When I choose 13th generation
    Then I am told to lower that trait first
    And base generation is still 6th

  Scenario Outline: The Generation Background is limited by the base generation
    Given a build at <base> generation with <dots> dots of the Generation Background
    Then the Generation Background cannot be raised above <max> dots

    Examples:
      | base | dots | max |
      | 4th  | 0    | 0   |
      | 5th  | 1    | 1   |
      | 6th  | 2    | 2   |

  Scenario: A typed number is judged when the entry is finished
    Given the Creation settings dialog is open
    When I type "7" and then "75" without leaving the field
    Then no refusal is shown while typing
    When I leave the field
    Then the freebie pool reads 90

  Scenario: A rejected entry is not saved and is cleared when corrected
    Given the Creation settings dialog is open and extra freebie points read 10
    When I enter "lots" as extra freebie points
    Then I am told extra freebie points must be a whole number from 0 to 999
    And after reloading the builder extra freebie points read 10
    When I enter 20 as extra freebie points
    Then the message is gone

  Scenario Outline: Settings drive the budgets and limits
    Given the Creation settings dialog is open
    When I choose "<generation>" and "<extra>" extra freebie points
    Then the maximum trait rating reads <trait>, the blood pool maximum <pool> and the freebie pool <freebies>

    Examples:
      | generation | extra | trait | pool | freebies |
      | 9th        | 0     | 5     | 14   | 15       |
      | 7th        | 10    | 6     | 20   | 25       |
      | 4th        | 75    | 9     | 50   | 90       |

  Scenario: Equality is accepted when lowering extra freebie points
    Given a build with 20 freebie points spent and 15 extra freebie points
    And the Creation settings dialog is open
    When I enter 5 as extra freebie points
    Then the freebie pool reads 20

  Scenario: Lowering extra freebie points below what is spent is refused
    Given a build with 10 extra freebie points and 20 freebie points spent
    And the Creation settings dialog is open
    When I enter 0 as extra freebie points
    Then I am told to undo purchases first
    And extra freebie points still read 10

  Scenario: Changes apply immediately and Escape keeps them
    Given the Creation settings dialog is open
    Then it says changes apply immediately
    When I choose 11th generation and press Escape
    Then the dialog closes, focus is on the Creation settings button and base generation is 11th

  Scenario: Escape after a refused entry keeps the previous valid value
    Given extra freebie points read 10 and the Creation settings dialog is open
    When I enter "lots" as extra freebie points and press Escape
    Then extra freebie points still read 10

  Scenario: Screen standards for the dialog
    Given the Creation settings dialog is open
    Then it has a labelled title and a close button named "Close"
    And axe reports no violations at 1512 px and 375 px, also with a refusal shown
    And it does not scroll the page horizontally at 320 px

  Scenario: Closing with Escape or the close button
    Given the Creation settings dialog is open
    When I press Escape
    Then the dialog closes and focus is on the Creation settings button
    When I open it again and choose the close button
    Then the dialog closes and focus is on the Creation settings button

  Scenario: Settings are no longer a step
    Then the step navigation has no Settings step
    And the builder opens on the concept step
