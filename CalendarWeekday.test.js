import React from 'react';
import { shallow } from 'enzyme';
import CalendarWeekday from './CalendarWeekday';
import moment from 'moment';

const events = [
	{
		id: 'event1',
		date: moment()
			.hours(8)
			.minutes(15)
			.seconds(0)
			.milliseconds(0)
			.toDate(),
		endDate: moment()
			.hours(12)
			.minutes(15)
			.seconds(0)
			.milliseconds(0)
			.toDate(),
		color: 'rgb(178, 223, 219)',
		title: 'Company Update',
	},
	{
		id: 'event2',
		date: moment()
			.hours(0)
			.minutes(0)
			.seconds(0)
			.milliseconds(0)
			.toDate(),
		endDate: moment()
			.add('1', 'days')
			.hours(0)
			.minutes(0)
			.seconds(0)
			.milliseconds(0)
			.toDate(),
		color: 'rgb(200, 227, 255)',
		title: 'Outlook',
	},
];

describe('Testing CalendarWeekday', () => {
	moment.locale('en');

	const props = {
		events,
		viewDate: new Date(),
		daysInWeek: 5,
		showHeader: true,
		highlightCurrentDay: true,
		hourClick: jest.fn(),
		eventClick: jest.fn(),
		dayStartHour: 0,
		dayEndHour: 23,
		renderAllDayEvent: event => event.title,
		renderEvent: event => event.title,
	};
	let component;

	beforeEach(() => {
		component = shallow(<CalendarWeekday {...props} />);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should defined days to render', () => {
		component.setProps({ viewDate: new Date(2019, 1, 1) });
		const days = component.state('days');

		expect(days.length).toBe(props.daysInWeek);

		for (let day = 0; day < props.daysInWeek; day++) {
			expect(days[day].isSame(moment(new Date(2019, 1, 1)).add(day, 'days'), 'day')).toBeTruthy();
		}
	});

	it('should remove resize', () => {
		window.removeEventListener = jest.fn();

		component.instance().componentWillUnmount();
		expect(window.removeEventListener).toHaveBeenCalledWith('resize', component.instance().handleResize);
	});

	it('should set cell reference', () => {
		const instance = component.instance();
		let newRef = { clientWidth: 150 };

		instance.cellElement = null;
		instance.setCellRef(newRef);
		expect(instance.cellElement).toBe(newRef);
		expect(component.state('cellWidth')).toBe(newRef.clientWidth);

		newRef = { clientWidth: 100 };
		instance.setCellRef(newRef);
		expect(instance.cellElement).not.toBe(newRef);
	});

	it('should store cell width in the state', () => {
		component.instance().cellElement = { clientWidth: 100 };
		window.dispatchEvent(new Event('resize'));
		expect(component.state('cellWidth')).toBe(100);
	});

	it('should handle hour click', () => {
		component.setProps({ viewDate: new Date(2019, 1, 1) });
		component
			.find('.CalendarWeekday__row .CalendarWeekday__cell')
			.at(1)
			.simulate('click', {
				currentTarget: { dataset: { hours: 8, minutes: 0, index: 0 } },
			});

		let actualDate = props.hourClick.mock.calls[0][0];
		expect(actualDate.toISOString()).toBe(new Date(2019, 1, 1, 8, 0).toISOString());

		component
			.find('.CalendarWeekday__row .CalendarWeekday__cell-divided')
			.at(1)
			.simulate('click', {
				currentTarget: { dataset: { hours: 8, minutes: 30, index: 0 } },
			});

		actualDate = props.hourClick.mock.calls[1][0];
		expect(actualDate.toISOString()).toBe(new Date(2019, 1, 1, 8, 30).toISOString());
	});

	it('should handle event click', () => {
		const [event] = events;
		const stopPropagation = jest.fn();

		component.setState({ cellWidth: 100 });
		component
			.find('.CalendarWeekday__EventContent')
			.first()
			.simulate('click', {
				stopPropagation,
				currentTarget: {
					dataset: { eventid: event.id },
				},
			});

		expect(stopPropagation).toHaveBeenCalled();
		expect(props.eventClick).toHaveBeenCalledWith(event);
	});

	it('should render current time', () => {
		expect(component.find('.CalendarWeekday__CurrentTime').exists()).toBeTruthy();

		component.setProps({
			viewDate: new Date(2019, 1, 1, 8, 30),
		});

		expect(component.find('.CalendarWeekday__CurrentTime').exists()).toBeFalsy();
	});

	it('should render events', () => {
		const [event] = events;
		component.setState({ cellWidth: 100 });
		const eventComponents = component.find('.CalendarWeekday__EventContent');

		expect(eventComponents.length).toBe(1);

		expect(eventComponents.props()).toEqual(
			expect.objectContaining({
				className: 'CalendarWeekday__EventContent',
				'data-eventid': event.id,
				style: {
					backgroundColor: event.color,
				},
			}),
		);
		expect(eventComponents.text()).toBe(event.title);
	});

	it('should render rows', () => {
		const rows = component.find('.CalendarWeekday__row');
		expect(rows.length).toBe((props.dayEndHour + 1 - props.dayStartHour) * 2);
		expect(
			rows
				.first()
				.find('.CalendarWeekday__hour')
				.text(),
		).toBe('00:00');
		expect(
			rows
				.at(rows.length - 2)
				.find('.CalendarWeekday__hour')
				.text(),
		).toBe('23:00');
	});

	it('should render events with a duration of all day', () => {
		const [event1, event2] = events;
		const eventComponents = component.find('.CalendarWeekday__AllDayEvent');

		expect(eventComponents.length).toBe(1);
		expect(eventComponents.props()).toEqual(
			expect.objectContaining({
				className: 'CalendarWeekday__AllDayEvent',
				'data-eventid': event2.id,
				style: {
					backgroundColor: event2.color,
				},
			}),
		);
		expect(eventComponents.text()).toBe(event2.title);
		component.setProps({ events: [event1] });
		expect(component.find('.CalendarWeekday__AllDayEvent').length).toBe(0);
	});

	it('should render header', () => {
		const cells = component.find('.CalendarWeekday__HeaderCell');

		expect(cells.at(1).text()).toBe(moment(props.viewDate).format('dddD'));

		component.setProps({ showHeader: false });
		expect(component.find('.CalendarWeekday__HeaderCell').length).toBe(0);
	});
});
